import type { SpellSlots } from './character.js';
import type { CharacterEffectEntry } from './characterEffects.js';
import type { CreatureHealth, HitPointsChange } from './hitPoints.js';

// Монстры и НПС на сцене — экземпляры со своим состоянием (docs/plan/done/game.md, этап 8):
// хиты и эффекты правит мастер, игроки видят только метку здоровья.

// Правка экземпляра: спасбросков от смерти у монстра и НПС нет.
export type GameCreatureChange = Exclude<
  HitPointsChange,
  { kind: 'death_saves' }
>;

export const GAME_CREATURE_CHANGE_KINDS = [
  'damage',
  'heal',
  'temp',
] as const satisfies readonly GameCreatureChange['kind'][];

// Ячейки и подготовка заклинаний экземпляра НПС (замечания после первой партии,
// 2026-10-26, вариант А): свои у каждого, как хиты. slots — ячейки копии с потраченными
// экземпляра; prepared — только отметки, отличные от копии (id способности → отметка).
export interface GameCreatureSpells {
  slots: SpellSlots;
  prepared: Record<string, boolean>;
}

export interface GameCreaturePreparedInput {
  prepared: boolean;
}

// Что видит мастер: хиты (максимум — из копии в библиотеке) и эффекты экземпляра.
export interface GameCreatureState {
  name: string;
  hitPoints: { current: number; max: number; temp: number };
  effects: CharacterEffectEntry[];
  // Запас движения на раунд (docs/plan/done/creature-movement.md): Скорость с эффектами
  // экземпляра, скорость лазания (null — нет), пройдено футов и взято «Рывков» — как
  // у фигурки (movementLeft, movementAllowance).
  movement: {
    speed: number;
    climb: number | null;
    moved: number;
    dashes: number;
  };
  // У НПС — ячейки и подготовка; у монстра (заклинания в день, без ячеек) — null.
  spells: GameCreatureSpells | null;
}

export interface GameCreature {
  // Номер объекта сцены.
  objectId: number;
  // «Ранен», «Повержен» — видно всем, кто видит существо.
  health: CreatureHealth | null;
  // Только мастеру; игроку — null.
  state: GameCreatureState | null;
}

export interface GameCreatures {
  sceneId: string;
  // Номер журнала на момент чтения: ответ старше уже применённого не откатывает.
  eventSeq: number;
  // Мастеру — все монстры и НПС сцены; игроку — только видимые ему и с меткой здоровья.
  creatures: GameCreature[];
}

// Хиты экземпляра до и после правки — для журнала.
export interface GameCreatureHitPoints {
  current: number;
  max: number;
  temp: number;
}

// Существо в записи журнала: номер объекта и имя на момент события.
export interface GameEventCreature {
  objectId: number;
  name: string;
}
