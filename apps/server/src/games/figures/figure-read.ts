import { and, asc, eq, isNotNull } from 'drizzle-orm';
import {
  activeEffects,
  FIGURE_SIZE,
  totalSpeed,
  type GameEventCharacter,
  type GameFigure,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { loadMainImages } from '../../character-images/character-image-access.js';
import { loadCharacterEffectLists } from '../../characters/effects/character-effects-loader.js';
import {
  characters,
  gameFigures,
  gameMembers,
} from '../../database/schema/index.js';

export type FigureRow = typeof gameFigures.$inferSelect;

// Кто может водить фигурку: мастер — всех, игрок — своего персонажа.
export function canMoveFigure(
  viewerId: string,
  masterId: string,
  ownerId: string,
): boolean {
  return viewerId === masterId || viewerId === ownerId;
}

// Скорость из листа с эффектами — как её видит владелец в своём листе. Эффекты пока
// читаются из справочника, а не из библиотеки игры: игра начнёт читать их оттуда на
// этапе 8 (docs/plan/game.md).
export async function figureSpeeds(
  db: Db,
  rows: { id: string; ownerId: string; speed: number }[],
): Promise<Map<string, number>> {
  const speeds = new Map<string, number>();
  const byOwner = new Map<string, string[]>();
  for (const { id, ownerId } of rows) {
    byOwner.set(ownerId, [...(byOwner.get(ownerId) ?? []), id]);
  }
  for (const [ownerId, ids] of byOwner) {
    const lists = await loadCharacterEffectLists(db, ownerId, ids);
    for (const row of rows.filter((r) => r.ownerId === ownerId)) {
      const effects = activeEffects(lists.get(row.id) ?? []);
      speeds.set(row.id, totalSpeed({ speed: row.speed }, effects).speed);
    }
  }
  return speeds;
}

// Фигурки сцены глазами смотрящего.
export async function readSceneFigures(
  db: Db,
  sceneId: string,
  viewerId: string,
  masterId: string,
): Promise<GameFigure[]> {
  const rows = await db
    .select({
      figure: gameFigures,
      name: characters.name,
      ownerId: characters.userId,
      speed: characters.speed,
    })
    .from(gameFigures)
    .innerJoin(characters, eq(characters.id, gameFigures.characterId))
    .where(eq(gameFigures.sceneId, sceneId))
    .orderBy(asc(characters.name), asc(gameFigures.characterId));
  const ids = rows.map((row) => row.figure.characterId);
  const images = await loadMainImages(db, ids);
  const speeds = await figureSpeeds(
    db,
    rows.map((row) => ({
      id: row.figure.characterId,
      ownerId: row.ownerId,
      speed: row.speed,
    })),
  );
  return rows.map(({ figure, name, ownerId, speed }) => ({
    character: { id: figure.characterId, name },
    ownerId,
    at: [figure.x, figure.y, figure.z],
    facing: figure.facing,
    size: FIGURE_SIZE,
    image: images.get(figure.characterId) ?? null,
    speed: speeds.get(figure.characterId) ?? speed,
    moved: figure.moved,
    dashes: figure.dashes,
    canMove: canMoveFigure(viewerId, masterId, ownerId),
  }));
}

// Персонажи на местах по порядку мест.
export async function seatedCharacters(
  db: Db,
  gameId: string,
): Promise<GameEventCharacter[]> {
  return db
    .select({ id: characters.id, name: characters.name })
    .from(gameMembers)
    .innerJoin(characters, eq(characters.id, gameMembers.characterId))
    .where(
      and(eq(gameMembers.gameId, gameId), isNotNull(gameMembers.characterId)),
    )
    .orderBy(asc(gameMembers.seatedAt), asc(characters.id));
}

// Персонажи на местах без фигурки на этой сцене: им не хватило стартовой точки.
export async function readUnplaced(
  db: Db,
  gameId: string,
  figures: readonly GameFigure[],
): Promise<GameEventCharacter[]> {
  const placed = new Set(figures.map((f) => f.character.id));
  const seated = await seatedCharacters(db, gameId);
  return seated.filter((c) => !placed.has(c.id));
}
