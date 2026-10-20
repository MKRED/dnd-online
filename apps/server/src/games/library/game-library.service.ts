import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type {
  CatalogImageVariant,
  GameLibraryEntry,
  GameLibraryItem,
  GameLibraryRef,
} from 'shared';
import { DatabaseService } from '../../database/database.service.js';
import {
  LIBRARY_ENTRY_NOT_FOUND,
  LIBRARY_NO_IMAGE,
  LIBRARY_SOURCE_MISSING,
  MASTER_ONLY_LIBRARY,
} from '../game-errors.js';
import { appendGameEvent, lockGame } from '../game-journal.js';
import { findGameAccess } from '../game-read.js';
import { GameRealtimeService } from '../realtime/game-realtime.service.js';
import { refreshLibraryEntry } from './library-copy.js';
import {
  findLibraryRow,
  listLibrary,
  readLibraryEntry,
  readLibraryImage,
} from './library-read.js';

// Библиотека игры для мастера (docs/plan/game.md, этап 4): список копий, карточка копии,
// её картинка и «Обновить из справочника». Игрокам библиотека закрыта: в ней будут
// скрытые монстры.
@Injectable()
export class GameLibraryService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly realtime: GameRealtimeService,
    @InjectPinoLogger(GameLibraryService.name)
    private readonly logger: PinoLogger,
  ) {}

  async list(viewerId: string, gameId: string): Promise<GameLibraryItem[]> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      await this.assertMaster(viewerId, gameId);
      const entries = await listLibrary(db, gameId, viewerId);
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          viewerId,
          gameId,
          count: entries.length,
        },
        'Game library listed',
      );
      return entries;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, viewerId, gameId },
        'Game library listing failed',
      );
      throw err;
    }
  }

  async findOne(
    viewerId: string,
    gameId: string,
    ref: GameLibraryRef,
  ): Promise<GameLibraryEntry> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      await this.assertMaster(viewerId, gameId);
      const row = await findLibraryRow(db, gameId, ref);
      if (!row) throw new NotFoundException(LIBRARY_ENTRY_NOT_FOUND);
      const entry = await readLibraryEntry(db, row, viewerId);
      this.logger.debug(
        { durationMs: Date.now() - t0, viewerId, gameId, ...ref },
        'Game library entry read',
      );
      return entry;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, viewerId, gameId, ...ref },
        'Game library entry lookup failed',
      );
      throw err;
    }
  }

  async imageFile(
    viewerId: string,
    gameId: string,
    ref: GameLibraryRef,
    variant: CatalogImageVariant,
  ): Promise<Buffer> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      await this.assertMaster(viewerId, gameId);
      const data = await readLibraryImage(db, gameId, ref, variant);
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          viewerId,
          gameId,
          ...ref,
          variant,
          found: !!data,
        },
        'Game library image lookup',
      );
      if (!data) throw new NotFoundException(LIBRARY_NO_IMAGE);
      return data;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, viewerId, gameId, ...ref, variant },
        'Game library image lookup failed',
      );
      throw err;
    }
  }

  // Копия переписывается из справочника глазами мастера; новые связи докопируются, уже
  // скопированные остаются как есть (решено с пользователем 2026-10-20).
  async refresh(
    viewerId: string,
    gameId: string,
    ref: GameLibraryRef,
  ): Promise<GameLibraryEntry> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      await this.assertMaster(viewerId, gameId);
      const result = await db.transaction(async (tx) => {
        await lockGame(tx, gameId);
        const row = await findLibraryRow(tx, gameId, ref);
        if (!row) throw new NotFoundException(LIBRARY_ENTRY_NOT_FOUND);
        const refreshed = await refreshLibraryEntry(
          tx,
          gameId,
          viewerId,
          ref,
          row.image?.version ?? 0,
        );
        if (!refreshed) throw new ConflictException(LIBRARY_SOURCE_MISSING);
        await appendGameEvent(tx, gameId, {
          kind: 'library.refreshed',
          actorId: viewerId,
          as: { kind: 'master' },
          intent: ref,
          result: refreshed,
        });
        return refreshed;
      });
      this.realtime.publish(gameId);
      this.logger.info(
        {
          durationMs: Date.now() - t0,
          viewerId,
          gameId,
          ...ref,
          copied: result.copied,
        },
        'Game library entry refreshed',
      );
      return this.findOne(viewerId, gameId, ref);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, viewerId, gameId, ...ref },
        'Game library refresh failed',
      );
      throw err;
    }
  }

  private async assertMaster(viewerId: string, gameId: string) {
    const { game } = await findGameAccess(
      this.databaseService.db,
      gameId,
      viewerId,
    );
    if (game.masterId !== viewerId) {
      throw new ForbiddenException(MASTER_ONLY_LIBRARY);
    }
  }
}
