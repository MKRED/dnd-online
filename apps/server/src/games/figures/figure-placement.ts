import { eq } from 'drizzle-orm';
import {
  FIGURE_SIZE,
  occupantsAt,
  standHeight,
  type GameEventCharacter,
  type GameFigurePlacement,
  type Occupant,
} from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import { gameFigures } from '../../database/schema/index.js';
import { appendGameEvent } from '../game-journal.js';
import type { SceneRow } from '../scenes/scene-copy.js';
import { findActiveScene } from '../scenes/scene-read.js';
import { seatedCharacters } from './figure-read.js';
import { loadSceneWorld, type SceneWorld } from './scene-world.js';

// Фигурки встают на свободные стартовые точки (docs/plan/game.md, этап 7): когда сцена
// становится активной — все персонажи на местах по порядку мест, когда персонаж садится
// на место посреди игры — он один. Кому точки не хватило, того ставит мастер. Вызывать
// внутри транзакции, которая уже взяла lockGame.

// Свободная точка — та, где фигурка может стоять и никто не стоит: ни существо карты
// (даже скрытое — ставит сервер, не игрок), ни уже поставленная фигурка. Скрытая точка
// не годится: фигурка на ней выдала бы её игрокам.
async function placeOnStarts(
  tx: DbTransaction,
  scene: SceneRow,
  world: SceneWorld,
  wanted: readonly GameEventCharacter[],
  standing: Occupant[],
): Promise<{
  placed: GameFigurePlacement[];
  unplaced: GameEventCharacter[];
}> {
  const occupants = [...world.creatures, ...standing];
  const placed: GameFigurePlacement[] = [];
  const unplaced: GameEventCharacter[] = [];
  for (const character of wanted) {
    const start = world.starts.find(
      ({ at, hidden }) =>
        !hidden &&
        standHeight(world.map, at, FIGURE_SIZE) !== null &&
        occupantsAt(world.map, at, FIGURE_SIZE, occupants).length === 0,
    );
    if (!start) {
      unplaced.push(character);
      continue;
    }
    occupants.push({ at: start.at, size: FIGURE_SIZE, ally: true });
    placed.push({ character, at: start.at });
    await tx.insert(gameFigures).values({
      characterId: character.id,
      gameId: scene.gameId,
      sceneId: scene.id,
      x: start.at[0],
      y: start.at[1],
      z: start.at[2],
      facing: start.facing,
    });
  }
  return { placed, unplaced };
}

// Сцена стала активной (добавлена первой, переключена, перезапущена): фигурки прежней
// сцены снимаются, персонажи на местах встают на точки новой.
export async function placeFiguresOnScene(
  tx: DbTransaction,
  scene: SceneRow,
  masterId: string,
): Promise<void> {
  await tx.delete(gameFigures).where(eq(gameFigures.gameId, scene.gameId));
  const seated = await seatedCharacters(tx, scene.gameId);
  if (seated.length === 0) return;
  const world = await loadSceneWorld(tx, scene);
  const result = await placeOnStarts(tx, scene, world, seated, []);
  await appendGameEvent(tx, scene.gameId, {
    kind: 'figures.placed',
    actorId: masterId,
    as: { kind: 'master' },
    sceneId: scene.id,
    intent: { reason: 'scene' },
    result: { scene: { id: scene.id, name: scene.name }, ...result },
  });
}

// Персонаж сел на место, а активная сцена уже есть: встаёт на свободную точку.
export async function placeSeatedFigure(
  tx: DbTransaction,
  gameId: string,
  actorId: string,
  character: GameEventCharacter,
): Promise<void> {
  const scene = await findActiveScene(tx, gameId);
  if (!scene) return;
  const world = await loadSceneWorld(tx, scene);
  const standing = await tx
    .select({ x: gameFigures.x, y: gameFigures.y, z: gameFigures.z })
    .from(gameFigures)
    .where(eq(gameFigures.gameId, gameId));
  const result = await placeOnStarts(
    tx,
    scene,
    world,
    [character],
    standing.map(({ x, y, z }) => ({
      at: [x, y, z],
      size: FIGURE_SIZE,
      ally: true,
    })),
  );
  await appendGameEvent(tx, gameId, {
    kind: 'figures.placed',
    actorId,
    sceneId: scene.id,
    intent: { reason: 'seat' },
    result: { scene: { id: scene.id, name: scene.name }, ...result },
  });
}

// Место освободилось — фигурка уходит со сцены. Удаление персонажа снимает её каскадом.
export async function removeFigure(
  tx: DbTransaction,
  characterId: string,
): Promise<void> {
  await tx.delete(gameFigures).where(eq(gameFigures.characterId, characterId));
}
