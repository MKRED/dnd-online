import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { ApiTokenInfo, CreatedApiToken } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import { apiTokens, users } from '../database/schema/index.js';
import type { AccessTokenPayload } from '../auth/token.service.js';
import { generateApiToken, hashApiToken } from './api-token.format.js';

function toInfo(row: typeof apiTokens.$inferSelect): ApiTokenInfo {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class ApiTokensService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(ApiTokensService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(userId: string, name: string): Promise<CreatedApiToken> {
    const t0 = Date.now();
    try {
      const { token, prefix } = generateApiToken();
      const [row] = await this.databaseService.db
        .insert(apiTokens)
        .values({ userId, name, prefix, tokenHash: hashApiToken(token) })
        .returning();
      this.logger.info(
        { durationMs: Date.now() - t0, userId, tokenId: row.id },
        'API token created',
      );
      return { token, info: toInfo(row) };
    } catch (err: unknown) {
      this.logger.error({ err, userId }, 'API token creation failed');
      throw err;
    }
  }

  async listForUser(userId: string): Promise<ApiTokenInfo[]> {
    const t0 = Date.now();
    try {
      const rows = await this.databaseService.db
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.userId, userId))
        .orderBy(desc(apiTokens.createdAt));
      this.logger.debug(
        { durationMs: Date.now() - t0, userId, count: rows.length },
        'API tokens listed',
      );
      return rows.map(toInfo);
    } catch (err: unknown) {
      this.logger.error({ err, userId }, 'API token listing failed');
      throw err;
    }
  }

  async revoke(userId: string, id: string): Promise<void> {
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .delete(apiTokens)
        .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, userId)))
        .returning({ id: apiTokens.id });
      if (!row) throw new NotFoundException('Токен не найден');
      this.logger.info(
        { durationMs: Date.now() - t0, userId, tokenId: id },
        'API token revoked',
      );
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(
        { err, userId, tokenId: id },
        'API token revoke failed',
      );
      throw err;
    }
  }

  // Владелец токена или null, если токен неизвестен (отозван или выдуман).
  async verify(token: string): Promise<AccessTokenPayload | null> {
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .update(apiTokens)
        .set({ lastUsedAt: new Date() })
        .from(users)
        .where(
          and(
            eq(apiTokens.tokenHash, hashApiToken(token)),
            eq(users.id, apiTokens.userId),
          ),
        )
        .returning({ userId: apiTokens.userId, login: users.login });
      this.logger.debug(
        { durationMs: Date.now() - t0, valid: Boolean(row) },
        'API token verified',
      );
      return row ? { sub: row.userId, login: row.login } : null;
    } catch (err: unknown) {
      this.logger.error({ err }, 'API token verification failed');
      throw err;
    }
  }
}
