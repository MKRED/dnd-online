import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { CharacterLinkAccess } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import { characters } from '../database/schema/index.js';
import { CharactersService } from './characters.service.js';

// Доступ по ссылке меняет только автор, отдельно от листа: диалог «Поделиться» сохраняет
// выбор сразу, без формы.
@Injectable()
export class CharacterAccessService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly charactersService: CharactersService,
    @InjectPinoLogger(CharacterAccessService.name)
    private readonly logger: PinoLogger,
  ) {}

  async setLinkAccess(
    userId: string,
    id: string,
    linkAccess: CharacterLinkAccess,
  ) {
    const t0 = Date.now();
    try {
      const [row] = await this.databaseService.db
        .update(characters)
        // updatedAt оставляем прежним: список сортируется по правкам листа, а доступ —
        // не правка, и персонаж не должен из-за него прыгать наверх.
        .set({ linkAccess, updatedAt: sql`${characters.updatedAt}` })
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .returning({ id: characters.id });
      if (!row) throw new NotFoundException('Персонаж не найден');
      this.logger.info(
        { durationMs: Date.now() - t0, userId, characterId: id, linkAccess },
        'Character link access changed',
      );
      return this.charactersService.findOneVisible(userId, id);
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, characterId: id },
        'Character link access change failed',
      );
      throw err;
    }
  }
}
