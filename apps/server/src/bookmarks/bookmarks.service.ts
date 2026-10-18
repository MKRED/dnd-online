import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Bookmark, BookmarkKind, BookmarkState } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import { bookmarks } from '../database/schema/index.js';
import { BOOKMARK_TARGETS } from './bookmark-targets.js';
import { loadBookmarks } from './bookmarks-loader.js';

export const BOOKMARK_TARGET_NOT_FOUND = 'Не найдено';

// Закладки игрока (docs/plan/bookmarks.md). Видит и меняет их только хозяин.
@Injectable()
export class BookmarksService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(BookmarksService.name)
    private readonly logger: PinoLogger,
  ) {}

  async list(userId: string): Promise<Bookmark[]> {
    const t0 = Date.now();
    try {
      const list = await loadBookmarks(this.databaseService.db, userId);
      this.logger.debug(
        { durationMs: Date.now() - t0, userId, count: list.length },
        'Bookmarks listed',
      );
      return list;
    } catch (err: unknown) {
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId },
        'Bookmarks list failed',
      );
      throw err;
    }
  }

  // Стоит ли закладка — только своя строка, доступ к цели не нужен.
  async state(
    userId: string,
    kind: BookmarkKind,
    targetId: string,
  ): Promise<BookmarkState> {
    const t0 = Date.now();
    const log = { userId, kind, targetId };
    try {
      const [row] = await this.databaseService.db
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(this.own(userId, kind, targetId))
        .limit(1);
      this.logger.debug(
        { ...log, durationMs: Date.now() - t0, bookmarked: Boolean(row) },
        'Bookmark state read',
      );
      return { bookmarked: Boolean(row) };
    } catch (err: unknown) {
      this.logger.error(
        { err, ...log, durationMs: Date.now() - t0 },
        'Bookmark state read failed',
      );
      throw err;
    }
  }

  // Отметить можно только то, что видно сейчас: чужое скрытое неотличимо от
  // несуществующего. Повтор ничего не меняет — звёздочку могли нажать в двух вкладках.
  async add(
    userId: string,
    kind: BookmarkKind,
    targetId: string,
  ): Promise<BookmarkState> {
    const t0 = Date.now();
    const log = { userId, kind, targetId };
    const target = BOOKMARK_TARGETS[kind];
    try {
      const inserted = await this.databaseService.db.transaction(async (tx) => {
        const [visible] = await tx
          .select({ id: target.id })
          .from(target.table)
          .where(target.visible(userId, targetId))
          .limit(1);
        if (!visible) throw new NotFoundException(BOOKMARK_TARGET_NOT_FOUND);
        return tx
          .insert(bookmarks)
          .values({ userId, [target.field]: targetId })
          .onConflictDoNothing()
          .returning({ id: bookmarks.id });
      });
      this.logger.info(
        { ...log, durationMs: Date.now() - t0, created: inserted.length > 0 },
        'Bookmark added',
      );
      return { bookmarked: true };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, ...log, durationMs: Date.now() - t0 },
        'Bookmark add failed',
      );
      throw err;
    }
  }

  // Доступ к цели не проверяем: иначе закладку на скрытую автором запись нельзя было бы
  // убрать. Убирать нечего — тоже успех.
  async remove(
    userId: string,
    kind: BookmarkKind,
    targetId: string,
  ): Promise<void> {
    const t0 = Date.now();
    const log = { userId, kind, targetId };
    try {
      const removed = await this.databaseService.db
        .delete(bookmarks)
        .where(this.own(userId, kind, targetId))
        .returning({ id: bookmarks.id });
      this.logger.info(
        { ...log, durationMs: Date.now() - t0, removed: removed.length },
        'Bookmark removed',
      );
    } catch (err: unknown) {
      this.logger.error(
        { err, ...log, durationMs: Date.now() - t0 },
        'Bookmark remove failed',
      );
      throw err;
    }
  }

  private own(userId: string, kind: BookmarkKind, targetId: string) {
    return and(
      eq(bookmarks.userId, userId),
      eq(BOOKMARK_TARGETS[kind].column, targetId),
    );
  }
}
