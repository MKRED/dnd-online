import { and, asc, eq, inArray } from 'drizzle-orm';
import type { CombatantRef, GameEventCombatant } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import {
  characters,
  gameCombatants,
  gameFigures,
  gameMembers,
  games,
} from '../../database/schema/index.js';
import {
  loadSceneCreatures,
  type SceneCreature,
} from '../creatures/creature-read.js';

export type CombatantRow = typeof gameCombatants.$inferSelect;

// Участник боя с тем, кто он на сцене: фигурка с владельцем и управляющим или существо
// сцены. Участник, которого на сцене больше нет (убрали правкой, персонаж ушёл), в бою
// не показывается и не ходит.
export interface LiveCombatant {
  row: CombatantRow;
  ref: CombatantRef;
  name: string;
  figure: {
    ownerId: string;
    controllerId: string | null;
    at: [number, number, number];
  } | null;
  creature: SceneCreature | null;
}

export interface CombatState {
  round: number | null;
  turn: string | null;
  // По очереди: бросившие по месту, потом не бросившие — как их позвали.
  combatants: LiveCombatant[];
}

export async function loadCombat(
  db: Db,
  gameId: string,
  sceneId: string,
): Promise<CombatState> {
  const [game] = await db
    .select({ round: games.combatRound, turn: games.combatTurn })
    .from(games)
    .where(eq(games.id, gameId));
  const rows = await db
    .select()
    .from(gameCombatants)
    .where(eq(gameCombatants.sceneId, sceneId))
    .orderBy(asc(gameCombatants.place), asc(gameCombatants.joinedAt));
  const figureIds = rows.flatMap((r) => r.characterId ?? []);
  const figures =
    figureIds.length === 0
      ? []
      : await db
          .select({
            id: gameFigures.characterId,
            x: gameFigures.x,
            y: gameFigures.y,
            z: gameFigures.z,
            name: characters.name,
            ownerId: characters.userId,
            controllerId: gameMembers.controllerId,
          })
          .from(gameFigures)
          .innerJoin(characters, eq(characters.id, gameFigures.characterId))
          .leftJoin(
            gameMembers,
            eq(gameMembers.characterId, gameFigures.characterId),
          )
          .where(
            and(
              eq(gameFigures.sceneId, sceneId),
              inArray(gameFigures.characterId, figureIds),
            ),
          );
  const creatures = rows.some((r) => r.objectId !== null)
    ? await loadSceneCreatures(db, gameId, sceneId)
    : [];
  const combatants = rows.flatMap((row): LiveCombatant[] => {
    if (row.characterId !== null) {
      const f = figures.find((x) => x.id === row.characterId);
      if (!f) return [];
      return [
        {
          row,
          ref: { kind: 'figure', characterId: f.id },
          name: f.name,
          figure: {
            ownerId: f.ownerId,
            controllerId: f.controllerId,
            at: [f.x, f.y, f.z],
          },
          creature: null,
        },
      ];
    }
    const creature = creatures.find((c) => c.objectId === row.objectId);
    if (!creature) return [];
    return [
      {
        row,
        ref: { kind: 'creature', objectId: creature.objectId },
        name: creature.name,
        figure: null,
        creature,
      },
    ];
  });
  // Ход у ушедшего со сцены участника — ничей: мастер передаст его сам.
  const turn = combatants.some((c) => c.row.id === game.turn)
    ? game.turn
    : null;
  return { round: game.round, turn, combatants };
}

// Очередь — только бросившие инициативу.
export const rolledOf = (state: CombatState) =>
  state.combatants.filter((c) => c.row.initiative !== null);

export const eventCombatant = (c: LiveCombatant): GameEventCombatant => ({
  id: c.row.id,
  name: c.name,
  ref: c.ref,
});
