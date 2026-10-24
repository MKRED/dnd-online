import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NICKNAME_MAX, normalizeNickname } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import { userIdentities, users } from '../database/schema/index.js';

type User = typeof users.$inferSelect;

export interface ExternalIdentity {
  // Кто подтвердил личность: 'lolka'.
  provider: string;
  // Постоянный id пользователя у провайдера.
  subject: string;
  // Ник для нового аккаунта; существующему не меняем — дальше он наш.
  nickname: string;
}

// Postgres: нарушение уникальности. Drizzle кладёт ошибку драйвера в `cause`.
export function isUniqueViolation(err: unknown): boolean {
  const code = (e: unknown) => (e as { code?: unknown } | null)?.code;
  return (
    code(err) === '23505' ||
    code((err as { cause?: unknown })?.cause) === '23505'
  );
}

// Вход через внешний сервис (лольку и любой следующий): основа — наша таблица users,
// а user_identities лишь говорит, какой пользователь стоит за внешним аккаунтом.
@Injectable()
export class UserIdentitiesService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(UserIdentitiesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async findOrCreateUser(
    identity: ExternalIdentity,
  ): Promise<{ user: User; created: boolean }> {
    const existing = await this.findUser(identity);
    if (existing) return { user: existing, created: false };

    const t0 = Date.now();
    try {
      const user = await this.databaseService.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(users)
          .values({
            login: technicalLogin(identity.provider),
            nickname: toNickname(identity.nickname),
            // Пароля нет: по логину в аккаунт не войти, пока владелец его не задаст.
            passwordHash: null,
          })
          .returning();
        await tx.insert(userIdentities).values({
          userId: created.id,
          provider: identity.provider,
          subject: identity.subject,
        });
        return created;
      });
      this.logger.info(
        {
          durationMs: Date.now() - t0,
          provider: identity.provider,
          userId: user.id,
        },
        'User created through external sign-in',
      );
      return { user, created: true };
    } catch (err) {
      // Два одновременных первых входа одного человека (двойной клик, две вкладки):
      // второй упирается в unique(provider, subject) — берём аккаунт, созданный первым.
      if (isUniqueViolation(err)) {
        const raced = await this.findUser(identity);
        if (raced) return { user: raced, created: false };
      }
      this.logger.error(
        { err, provider: identity.provider },
        'Failed to create user through external sign-in',
      );
      throw err;
    }
  }

  // Какими внешними сервисами пользователь может войти — для страницы профиля.
  async providersOf(userId: string): Promise<string[]> {
    const t0 = Date.now();
    const rows = await this.databaseService.db
      .select({ provider: userIdentities.provider })
      .from(userIdentities)
      .where(eq(userIdentities.userId, userId));
    this.logger.debug(
      { durationMs: Date.now() - t0, userId, count: rows.length },
      'External identities listed',
    );
    return rows.map((row) => row.provider);
  }

  private async findUser(
    identity: ExternalIdentity,
  ): Promise<User | undefined> {
    const t0 = Date.now();
    const [row] = await this.databaseService.db
      .select({ user: users })
      .from(userIdentities)
      .innerJoin(users, eq(users.id, userIdentities.userId))
      .where(
        and(
          eq(userIdentities.provider, identity.provider),
          eq(userIdentities.subject, identity.subject),
        ),
      )
      .limit(1);
    this.logger.debug(
      {
        durationMs: Date.now() - t0,
        provider: identity.provider,
        found: Boolean(row),
      },
      'User lookup by external identity',
    );
    return row?.user;
  }
}

// Логин обязателен и уникален (он в JWT и в /auth/me), но человек из лольки его не
// выбирал: даём технический, который владелец потом сменит на свой в профиле.
function technicalLogin(provider: string): string {
  return `${provider}_${randomBytes(4).toString('hex')}`;
}

function toNickname(raw: string): string {
  const trimmed = normalizeNickname(raw).slice(0, NICKNAME_MAX).trim();
  return trimmed || 'Игрок';
}
