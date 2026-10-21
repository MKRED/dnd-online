import type { CharacterEffectEntry } from './characterEffects.js';
import type { CreatureHealth, HitPointsChange } from './hitPoints.js';

// Монстры и НПС на сцене — экземпляры со своим состоянием (docs/plan/game.md, этап 8):
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

// Что видит мастер: хиты (максимум — из копии в библиотеке) и эффекты экземпляра.
export interface GameCreatureState {
  name: string;
  hitPoints: { current: number; max: number; temp: number };
  effects: CharacterEffectEntry[];
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
