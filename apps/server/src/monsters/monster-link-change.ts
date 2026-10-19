import { HttpException } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import { lockAuthoredEntry, type Db } from '../catalog/catalog-access.js';
import type {
  DatabaseService,
  DbTransaction,
} from '../database/database.service.js';
import { MONSTER_ACCESS } from './monsters.config.js';

export interface MonsterLinkChange<T> {
  databaseService: DatabaseService;
  logger: PinoLogger;
  // Что меняем — для логов: «abilities», «items», «effects».
  links: string;
  kind: string;
  log: { userId: string; monsterId: string } & Record<string, unknown>;
  apply: (tx: DbTransaction) => Promise<void>;
  load: (db: Db, viewerId: string, monsterId: string) => Promise<T[]>;
}

// Правка связей монстра — способностей, снаряжения, эффектов. Меняет только автор: чужой
// опубликованный — 403, скрытый — 404, как правка записи каталога. Правка идёт в
// транзакции под блокировкой монстра; ответ — список целиком.
export async function changeMonsterLinks<T>({
  databaseService,
  logger,
  links,
  kind,
  log,
  apply,
  load,
}: MonsterLinkChange<T>): Promise<T[]> {
  const t0 = Date.now();
  const { userId, monsterId } = log;
  try {
    await databaseService.db.transaction(async (tx) => {
      await lockAuthoredEntry(tx, MONSTER_ACCESS, userId, monsterId);
      await apply(tx);
    });
    const list = await load(databaseService.db, userId, monsterId);
    logger.info(
      { ...log, links, kind, count: list.length, durationMs: Date.now() - t0 },
      'Monster links changed',
    );
    return list;
  } catch (err: unknown) {
    // 400, 403, 404 и 409 — ответ клиенту, а не сбой.
    if (err instanceof HttpException) throw err;
    logger.error(
      { err, ...log, links, kind, durationMs: Date.now() - t0 },
      'Monster links change failed',
    );
    throw err;
  }
}
