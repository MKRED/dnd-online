import { eq } from 'drizzle-orm';
import {
  creatureBody,
  damageDefenses,
  FIGURE_SIZE,
  fighterConditions,
  fighterEffectsOf,
  sheetTotals,
  zeroHitPointsEffect,
  type BodyBox,
  type Box3,
  type Character,
  type CombatantRef,
  type ConditionKind,
  type DamageDefenses,
  type FighterEffects,
  type Vec3,
} from 'shared';
import type { DbTransaction } from '../../../database/database.service.js';
import {
  characters,
  gameFigures,
  gameMembers,
} from '../../../database/schema/index.js';
import type { SeatedCharacter } from '../../characters/game-character-access.js';
import { readGameCharacter } from '../../characters/game-character-read.js';
import type { SceneCreature } from '../../creatures/creature-read.js';
import type { SceneWorld } from '../../figures/scene-world.js';
import type { SceneRow } from '../../scenes/scene-copy.js';
import { creatureFighters } from './attack-creatures.js';
import { cellsOf } from './attack-geometry.js';

// Существа сцены глазами правил атаки (docs/plan/combat.md, этап 5): где стоят, КД с
// эффектами, эффекты и состояния, защиты от урона. Герой — по листу в игре, монстр и НПС —
// по копии в библиотеке с эффектами экземпляра, как их карточка на сцене.

export interface Fighter {
  ref: CombatantRef;
  name: string;
  body: BodyBox;
  cells: Box3;
  hidden: boolean;
  // Герой партии; монстры и НПС — нет.
  party: boolean;
  // Монстр или НПС на 0 хитов повержен и не цель; герой на 0 — Без сознания, цель.
  down: boolean;
  armorClass: number;
  effects: FighterEffects;
  conditions: Set<ConditionKind>;
  defenses: DamageDefenses;
  hitPoints: { current: number; max: number; temp: number };
  // Лист героя: из него — его атаки; у монстра и НПС null.
  character: Character | null;
  seated: SeatedCharacter | null;
  creature: SceneCreature | null;
}

async function heroFighters(
  tx: DbTransaction,
  gameId: string,
  scene: SceneRow,
  world: SceneWorld,
): Promise<Fighter[]> {
  const rows = await tx
    .select({
      id: gameFigures.characterId,
      name: characters.name,
      ownerId: characters.userId,
      controllerId: gameMembers.controllerId,
      x: gameFigures.x,
      y: gameFigures.y,
      z: gameFigures.z,
    })
    .from(gameFigures)
    .innerJoin(characters, eq(characters.id, gameFigures.characterId))
    .innerJoin(
      gameMembers,
      eq(gameMembers.characterId, gameFigures.characterId),
    )
    .where(eq(gameFigures.sceneId, scene.id));
  return Promise.all(
    rows.map(async (row): Promise<Fighter> => {
      const seated: SeatedCharacter = {
        id: row.id,
        name: row.name,
        ownerId: row.ownerId,
        controllerId: row.controllerId,
      };
      const character = await readGameCharacter(tx, gameId, seated);
      const at: Vec3 = [row.x, row.y, row.z];
      const zero =
        character.hitPointsCurrent === 0 ? [zeroHitPointsEffect] : [];
      const effects = fighterEffectsOf(
        character.effects,
        character.abilities,
        zero,
      );
      return {
        ref: { kind: 'figure', characterId: row.id },
        name: row.name,
        body: creatureBody(world.map, at, FIGURE_SIZE),
        cells: cellsOf(at, FIGURE_SIZE),
        hidden: false,
        party: true,
        down: false,
        armorClass: sheetTotals(character).armorClass,
        effects,
        conditions: fighterConditions(effects.effects),
        defenses: damageDefenses(effects.effects),
        hitPoints: {
          current: character.hitPointsCurrent,
          max: character.hitPointsMax,
          temp: character.hitPointsTemp,
        },
        character,
        seated,
        creature: null,
      };
    }),
  );
}

export async function loadSceneFighters(
  tx: DbTransaction,
  gameId: string,
  masterId: string,
  scene: SceneRow,
  world: SceneWorld,
): Promise<Fighter[]> {
  return [
    ...(await heroFighters(tx, gameId, scene, world)),
    ...(await creatureFighters(tx, gameId, masterId, scene, world)),
  ];
}

export const sameRef = (a: CombatantRef, b: CombatantRef) =>
  a.kind === 'figure'
    ? b.kind === 'figure' && a.characterId === b.characterId
    : b.kind === 'creature' && a.objectId === b.objectId;
