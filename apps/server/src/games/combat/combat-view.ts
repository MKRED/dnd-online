import { asc, eq } from 'drizzle-orm';
import {
  creatureSeen,
  type CombatCandidate,
  type FogMasks,
  type GameCombat,
  type GameCombatant,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { characters, gameFigures, games } from '../../database/schema/index.js';
import { loadSceneCreatures } from '../creatures/creature-read.js';
import { playerFog } from '../fog/fog-view.js';
import type { SceneRow } from '../scenes/scene-copy.js';
import { drives } from './combat-actor.js';
import { initiativeInputOf } from './combat-initiative.js';
import { loadCombat, type LiveCombatant } from './combatant-read.js';

// Очередь боя глазами смотрящего (docs/plan/combat.md, этап 2). Игроку — участники, которых
// видит партия: фигурки всегда, существо — не скрытое мастером и в поле зрения под
// туманом, как метки здоровья на сцене. Бросок со слагаемыми — тем, кто водит участника.

const seenByParty = (c: LiveCombatant, fog: FogMasks | null) =>
  !c.creature || (!c.creature.hidden && creatureSeen(c.creature.at, fog));

async function toCombatant(
  db: Db,
  gameId: string,
  sceneId: string,
  c: LiveCombatant,
  viewer: { userId: string; masterId: string },
): Promise<GameCombatant> {
  const own = drives(viewer, c);
  const master = viewer.userId === viewer.masterId;
  const pending =
    own && c.row.initiative === null
      ? (await initiativeInputOf(db, gameId, sceneId, c)).input
      : null;
  return {
    id: c.row.id,
    ref: c.ref,
    name: c.name,
    initiative: c.row.initiative,
    surprised: master || c.figure ? c.row.surprised : false,
    canRoll: own,
    roll: own ? c.row.roll : null,
    pending,
  };
}

// Кого ещё можно позвать: фигурки и существа сцены не в бою. seen — по туману партии.
async function readCandidates(
  db: Db,
  gameId: string,
  scene: SceneRow,
  combatants: readonly LiveCombatant[],
  fog: FogMasks | null,
): Promise<CombatCandidate[]> {
  const inFight = new Set(
    combatants.map((c) =>
      c.ref.kind === 'figure' ? c.ref.characterId : c.ref.objectId,
    ),
  );
  const figures = await db
    .select({ id: gameFigures.characterId, name: characters.name })
    .from(gameFigures)
    .innerJoin(characters, eq(characters.id, gameFigures.characterId))
    .where(eq(gameFigures.sceneId, scene.id))
    .orderBy(asc(characters.name), asc(gameFigures.characterId));
  const creatures = await loadSceneCreatures(db, gameId, scene.id);
  return [
    ...figures
      .filter((f) => !inFight.has(f.id))
      .map((f): CombatCandidate => ({
        kind: 'figure',
        characterId: f.id,
        name: f.name,
        seen: true,
      })),
    ...creatures
      .filter((c) => !inFight.has(c.objectId))
      .map((c): CombatCandidate => ({
        kind: 'creature',
        objectId: c.objectId,
        name: c.name,
        seen: !c.hidden && creatureSeen(c.at, fog),
      })),
  ];
}

export async function readCombatView(
  db: Db,
  gameId: string,
  scene: SceneRow,
  viewer: { userId: string; masterId: string },
): Promise<GameCombat> {
  const [game] = await db
    .select({ eventSeq: games.eventSeq, mode: games.moveMode })
    .from(games)
    .where(eq(games.id, gameId));
  const state = await loadCombat(db, gameId, scene.id);
  const master = viewer.userId === viewer.masterId;
  const fog = await playerFog(db, scene);
  const visible = master
    ? state.combatants
    : state.combatants.filter((c) => seenByParty(c, fog));
  const turn = visible.some((c) => c.row.id === state.turn) ? state.turn : null;
  return {
    sceneId: scene.id,
    round: game.mode === 'tactical' ? state.round : null,
    combatants: await Promise.all(
      visible.map((c) => toCombatant(db, gameId, scene.id, c, viewer)),
    ),
    turn,
    candidates: master
      ? await readCandidates(db, gameId, scene, state.combatants, fog)
      : [],
    eventSeq: game.eventSeq,
  };
}
