import { Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DatabaseService } from '../database/database.service.js';
import { users } from '../database/schema/index.js';

type User = typeof users.$inferSelect;

export interface CreateUserInput {
  login: string;
  nickname: string;
  passwordHash: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(UsersService.name) private readonly logger: PinoLogger,
  ) {}

  // Без явного типа TypeScript выводит User, хотя `[user]` из пустой выборки — undefined.
  async findByLogin(login: string): Promise<User | undefined> {
    const t0 = Date.now();
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.login, login))
      .limit(1);
    this.logger.debug(
      { durationMs: Date.now() - t0, login, found: Boolean(user) },
      'User lookup by login',
    );
    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    const t0 = Date.now();
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    this.logger.debug(
      { durationMs: Date.now() - t0, id, found: Boolean(user) },
      'User lookup by id',
    );
    return user;
  }

  async createUser(input: CreateUserInput) {
    const t0 = Date.now();
    const [user] = await this.databaseService.db
      .insert(users)
      .values(input)
      .returning();
    this.logger.info(
      { durationMs: Date.now() - t0, login: input.login },
      'User created',
    );
    return user;
  }

  // Логин и пароль аккаунту, созданному через лольку. Условие `password_hash IS NULL`
  // в самом UPDATE: два параллельных запроса не перезапишут уже заданный пароль.
  // Вернёт false, если пароль уже был. Занятый логин — ошибка unique от базы.
  async setCredentials(
    id: string,
    login: string,
    passwordHash: string,
  ): Promise<boolean> {
    const t0 = Date.now();
    const updated = await this.databaseService.db
      .update(users)
      .set({ login, passwordHash })
      .where(and(eq(users.id, id), isNull(users.passwordHash)))
      .returning({ id: users.id });
    this.logger.info(
      { durationMs: Date.now() - t0, id, updated: updated.length },
      'User credentials set',
    );
    return updated.length > 0;
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const t0 = Date.now();
    await this.databaseService.db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id));
    this.logger.info(
      { durationMs: Date.now() - t0, id },
      'User password changed',
    );
  }

  // Ник не лежит в токенах, а его читают по join с users: новый виден везде сразу.
  async updateNickname(id: string, nickname: string): Promise<boolean> {
    const t0 = Date.now();
    const updated = await this.databaseService.db
      .update(users)
      .set({ nickname })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    this.logger.info(
      { durationMs: Date.now() - t0, id, updated: updated.length },
      'User nickname changed',
    );
    return updated.length > 0;
  }

  // Сливает переданные поля с уже сохранёнными прямо в UPDATE (jsonb ||): два
  // параллельных изменения разных настроек не затрут друг друга. undefined — нет такого
  // пользователя.
  async mergeSettings(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown> | undefined> {
    const t0 = Date.now();
    const [row] = await this.databaseService.db
      .update(users)
      .set({
        settings: sql`${users.settings} || ${JSON.stringify(patch)}::jsonb`,
      })
      .where(eq(users.id, id))
      .returning({ settings: users.settings });
    this.logger.info(
      { durationMs: Date.now() - t0, id, fields: Object.keys(patch) },
      'User settings updated',
    );
    return row?.settings;
  }
}
