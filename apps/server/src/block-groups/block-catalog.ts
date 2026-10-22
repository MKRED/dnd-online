import { eq } from 'drizzle-orm';
import {
  createBlockCatalog,
  parseCustomBlockName,
  readBlockGroupFields,
  toBlockGroupInfo,
  type BlockCatalog,
  type BlockGroupInfo,
  type Palette,
} from 'shared';
import type { Db } from '../catalog/catalog-access.js';
import { blockGroups, games } from '../database/schema/index.js';

// Каталог блоков карты: базовые блоки и свои группы её владельца (у сцены — мастера
// игры). На карту ставятся только свои блоки, чужие сначала копируют себе
// (docs/plan/blocks.md, «Решения»), поэтому чужие группы в каталог не попадают.
// Функции, а не только сервис: правила сцены (туман, ходы) живут в функциях игр,
// которые получают транзакцию, а не провайдеры.

const groupColumns = {
  id: blockGroups.id,
  name: blockGroups.name,
  details: blockGroups.details,
  extra: blockGroups.extra,
};

type GroupRow = {
  id: string;
  name: string;
  details: Record<string, unknown>;
  extra: Record<string, unknown>;
};

const toInfo = (row: GroupRow) =>
  toBlockGroupInfo({
    id: row.id,
    name: row.name,
    ...readBlockGroupFields(row.details, row.extra),
  });

export async function loadBlockGroups(
  db: Db,
  ownerId: string,
): Promise<BlockGroupInfo[]> {
  const rows = await db
    .select(groupColumns)
    .from(blockGroups)
    .where(eq(blockGroups.authorId, ownerId));
  return rows.map(toInfo);
}

// Группы мастера игры — для её сцен.
export async function loadGameBlockGroups(
  db: Db,
  gameId: string,
): Promise<BlockGroupInfo[]> {
  const rows = await db
    .select(groupColumns)
    .from(blockGroups)
    .innerJoin(games, eq(games.masterId, blockGroups.authorId))
    .where(eq(games.id, gameId));
  return rows.map(toInfo);
}

export async function loadGameBlockCatalog(
  db: Db,
  gameId: string,
): Promise<BlockCatalog> {
  return createBlockCatalog(await loadGameBlockGroups(db, gameId));
}

// Только группы, чьи блоки есть в палитре: игроку не нужны остальные блоки мастера.
export function groupsInPalette(
  groups: BlockGroupInfo[],
  palette: Palette,
): BlockGroupInfo[] {
  const used = new Set(
    palette.flatMap((name) => parseCustomBlockName(name)?.groupId ?? []),
  );
  return groups.filter((group) => used.has(group.id));
}
