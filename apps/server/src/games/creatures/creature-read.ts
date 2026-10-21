import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  creatureHealth,
  creatureSeen,
  type CharacterEffectEntry,
  type FogMasks,
  type GameCreature,
  type Vec3,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import {
  gameCreatureEffects,
  gameCreatures,
  gameLibrary,
  gameSceneObjects,
} from '../../database/schema/index.js';
import {
  libraryCreatureMaxHp,
  libraryCreatureClimb,
  libraryCreatureSpeed,
  libraryEffectFields,
} from '../library/library-record.js';
import { creatureMovement } from './creature-movement.js';

// Монстр или НПС сцены с тем, что о нём знает библиотека игры.
export interface SceneCreature {
  objectId: number;
  at: Vec3;
  hidden: boolean;
  name: string;
  max: number;
  // Скорость и скорость лазания (null — нет) без эффектов экземпляра.
  speed: number;
  climb: number | null;
}

// Существа сцены (все или одно): объекты-монстры и НПС, их копии в библиотеке. Копии
// нет (запись была скрыта от мастера при копии) — «Неизвестное существо» с 1 хитом.
export async function loadSceneCreatures(
  db: Db,
  gameId: string,
  sceneId: string,
  objectId?: number,
): Promise<SceneCreature[]> {
  const objects = await db
    .select()
    .from(gameSceneObjects)
    .where(
      and(
        eq(gameSceneObjects.sceneId, sceneId),
        inArray(gameSceneObjects.kind, ['monster', 'npc']),
        objectId === undefined ? undefined : eq(gameSceneObjects.id, objectId),
      ),
    )
    .orderBy(asc(gameSceneObjects.id));
  const sourceOf = (object: (typeof objects)[number]) =>
    String(
      object.kind === 'monster'
        ? object.fields.monsterId
        : object.fields.characterId,
    );
  const sources = [...new Set(objects.map(sourceOf))];
  const copies =
    sources.length === 0
      ? []
      : await db
          .select()
          .from(gameLibrary)
          .where(
            and(
              eq(gameLibrary.gameId, gameId),
              inArray(gameLibrary.kind, ['monster', 'npc']),
              inArray(gameLibrary.sourceId, sources),
            ),
          );
  return objects.map((object) => {
    const copy = copies.find(
      (row) => row.kind === object.kind && row.sourceId === sourceOf(object),
    );
    return {
      objectId: object.id,
      at: [object.x, object.y, object.z],
      hidden: object.hidden,
      name: copy?.name ?? 'Неизвестное существо',
      max: copy ? libraryCreatureMaxHp(copy) : 1,
      speed: copy ? libraryCreatureSpeed(copy) : 0,
      climb: copy ? libraryCreatureClimb(copy) : null,
    };
  });
}

// Строки состояния экземпляров сцены.
export function loadCreatureRows(db: Db, sceneId: string) {
  return db
    .select()
    .from(gameCreatures)
    .where(eq(gameCreatures.sceneId, sceneId));
}

// Хиты экземпляров: строки нет — полные. Максимум мог уменьшиться обновлением копии —
// текущие не выше него.
export async function loadCreatureHitPoints(
  db: Db,
  sceneId: string,
  creatures: readonly SceneCreature[],
  loaded?: Awaited<ReturnType<typeof loadCreatureRows>>,
) {
  const rows = loaded ?? (await loadCreatureRows(db, sceneId));
  return new Map(
    creatures.map((creature) => {
      const row = rows.find((r) => r.objectId === creature.objectId);
      return [
        creature.objectId,
        {
          current: Math.min(
            row?.hitPointsCurrent ?? creature.max,
            creature.max,
          ),
          max: creature.max,
          temp: row?.hitPointsTemp ?? 0,
        },
      ];
    }),
  );
}

// Эффекты экземпляров — из копий в библиотеке игры.
export async function loadCreatureEffects(
  db: Db,
  gameId: string,
  sceneId: string,
): Promise<Map<number, CharacterEffectEntry[]>> {
  const rows = await db
    .select({ entry: gameCreatureEffects, copy: gameLibrary })
    .from(gameCreatureEffects)
    .leftJoin(
      gameLibrary,
      and(
        eq(gameLibrary.gameId, gameId),
        eq(gameLibrary.kind, 'effect'),
        eq(gameLibrary.sourceId, gameCreatureEffects.effectId),
      ),
    )
    .where(eq(gameCreatureEffects.sceneId, sceneId))
    .orderBy(asc(gameCreatureEffects.addedAt), asc(gameCreatureEffects.id));
  const result = new Map<number, CharacterEffectEntry[]>();
  for (const { entry, copy } of rows) {
    const list = result.get(entry.objectId) ?? [];
    list.push(
      copy
        ? {
            id: entry.id,
            effect: {
              id: copy.sourceId,
              name: copy.name,
              isPublic: true,
              image: null,
              ...libraryEffectFields(copy),
            },
            missing: null,
            inactive: false,
          }
        : { id: entry.id, effect: null, missing: 'deleted' },
    );
    result.set(entry.objectId, list);
  }
  return result;
}

// Существа сцены глазами смотрящего: мастеру — все с хитами и эффектами, игроку — только
// не скрытые и видные группе сквозь туман (fog), с меткой здоровья, без чисел.
export async function readSceneCreatures(
  db: Db,
  gameId: string,
  sceneId: string,
  master: boolean,
  fog: FogMasks | null = null,
): Promise<GameCreature[]> {
  const creatures = await loadSceneCreatures(db, gameId, sceneId);
  const rows = await loadCreatureRows(db, sceneId);
  const hitPoints = await loadCreatureHitPoints(db, sceneId, creatures, rows);
  const effects = master
    ? await loadCreatureEffects(db, gameId, sceneId)
    : new Map<number, CharacterEffectEntry[]>();
  return creatures.flatMap((creature): GameCreature[] => {
    const hp = hitPoints.get(creature.objectId)!;
    const health = creatureHealth({ ...hp, deathFailures: 0 });
    if (!master) {
      return !creature.hidden && health && creatureSeen(creature.at, fog)
        ? [{ objectId: creature.objectId, health, state: null }]
        : [];
    }
    return [
      {
        objectId: creature.objectId,
        health,
        state: {
          name: creature.name,
          hitPoints: hp,
          effects: effects.get(creature.objectId) ?? [],
          movement: creatureMovement(
            creature,
            rows.find((row) => row.objectId === creature.objectId),
            effects.get(creature.objectId) ?? [],
          ),
        },
      },
    ];
  });
}
