import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DatabaseService } from '../database/database.service';
import { refreshTokens } from '../database/schema';

// Храним только sha256-хэш refresh-токена — сам JWT нигде в БД не лежит.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(RefreshTokenService.name)
    private readonly logger: PinoLogger,
  ) {}

  async store(userId: string, token: string, expiresAt: Date): Promise<void> {
    const t0 = Date.now();
    await this.databaseService.db.insert(refreshTokens).values({
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    });
    this.logger.debug(
      { durationMs: Date.now() - t0, userId, expiresAt },
      'Refresh token stored',
    );
  }

  async isValid(userId: string, token: string): Promise<boolean> {
    const t0 = Date.now();
    const [row] = await this.databaseService.db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.tokenHash, hashToken(token)),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    const valid = Boolean(row);
    this.logger.debug(
      { durationMs: Date.now() - t0, userId, valid },
      'Refresh token validity checked',
    );
    return valid;
  }

  async revoke(token: string): Promise<void> {
    const t0 = Date.now();
    const deleted = await this.databaseService.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(token)))
      .returning({ id: refreshTokens.id });
    this.logger.debug(
      { durationMs: Date.now() - t0, revoked: deleted.length },
      'Refresh token revoked',
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const t0 = Date.now();
    await this.databaseService.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId));
    this.logger.info(
      { durationMs: Date.now() - t0, userId },
      'All refresh tokens revoked for user',
    );
  }
}
