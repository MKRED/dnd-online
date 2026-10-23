import { and, asc, eq, isNotNull } from 'drizzle-orm';
import {
  activeEffects,
  creatureHealth,
  FIGURE_SIZE,
  totalSpeed,
  type GameEventCharacter,
  type GameFigure,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { loadMainImages } from '../../character-images/character-image-access.js';
import { loadFigureModels } from '../../character-models/character-model-row.js';
import {
  characters,
  gameFigures,
  gameMembers,
} from '../../database/schema/index.js';
import { loadGameEffectLists } from '../characters/game-character-effects.js';

export type FigureRow = typeof gameFigures.$inferSelect;

// Кто может водить фигурку: мастер — всех, игрок — своего персонажа и того, чьё
// управление мастер ему отдал (controllerId).
export function canMoveFigure(
  viewerId: string,
  masterId: string,
  ownerId: string,
  controllerId: string | null,
): boolean {
  return (
    viewerId === masterId || viewerId === ownerId || viewerId === controllerId
  );
}

// Скорость из листа с эффектами — эффекты из библиотеки игры (game-character-effects.ts);
// скорость лазания у персонажа только от эффектов.
export async function figureSpeeds(
  db: Db,
  gameId: string,
  rows: { id: string; ownerId: string; speed: number }[],
): Promise<Map<string, { speed: number; climb: number | null }>> {
  const lists = await loadGameEffectLists(
    db,
    gameId,
    new Map(rows.map((row) => [row.id, row.ownerId])),
  );
  return new Map(
    rows.map((row) => {
      const effects = activeEffects(lists.get(row.id) ?? []);
      const total = totalSpeed({ speed: row.speed }, effects);
      return [
        row.id,
        { speed: total.speed, climb: total.special.climb ?? null },
      ];
    }),
  );
}

// Фигурки сцены глазами смотрящего.
export async function readSceneFigures(
  db: Db,
  gameId: string,
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
      current: characters.hitPointsCurrent,
      max: characters.hitPointsMax,
      temp: characters.hitPointsTemp,
      deathFailures: characters.deathSaveFailures,
      controllerId: gameMembers.controllerId,
    })
    .from(gameFigures)
    .innerJoin(characters, eq(characters.id, gameFigures.characterId))
    .leftJoin(gameMembers, eq(gameMembers.characterId, gameFigures.characterId))
    .where(eq(gameFigures.sceneId, sceneId))
    .orderBy(asc(characters.name), asc(gameFigures.characterId));
  const ids = rows.map((row) => row.figure.characterId);
  const images = await loadMainImages(db, ids);
  const models = await loadFigureModels(db, ids);
  const speeds = await figureSpeeds(
    db,
    gameId,
    rows.map((row) => ({
      id: row.figure.characterId,
      ownerId: row.ownerId,
      speed: row.speed,
    })),
  );
  return rows.map(
    ({ figure, name, ownerId, speed, controllerId, temp, ...hp }) => {
      const canMove = canMoveFigure(viewerId, masterId, ownerId, controllerId);
      return {
        character: { id: figure.characterId, name },
        ownerId,
        at: [figure.x, figure.y, figure.z],
        facing: figure.facing,
        size: FIGURE_SIZE,
        image: images.get(figure.characterId) ?? null,
        model: models.get(figure.characterId) ?? null,
        speed: speeds.get(figure.characterId)?.speed ?? speed,
        climb: speeds.get(figure.characterId)?.climb ?? null,
        moved: figure.moved,
        dashes: figure.dashes,
        canMove,
        health: creatureHealth(hp),
        hitPoints: canMove ? { current: hp.current, max: hp.max, temp } : null,
      };
    },
  );
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
