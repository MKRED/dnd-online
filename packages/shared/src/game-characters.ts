import type { SpellSlots } from './character.js';
import type { HitPointsChange } from './hitPoints.js';
import type { SpellSlotsExpended } from './spellSlots.js';

// Персонаж игрока в игре (docs/plan/game.md, этап 8): хиты, ячейки и эффекты правят
// мастер, владелец и управляющий; правка пишется в лист владельца и в журнал.

// Что можно поменять одной правкой: хиты по правилам (hitPoints.ts) или потраченные
// ячейки — как на листе, число потраченных по кругам.
export type GameCharacterChange =
  HitPointsChange | { kind: 'spell_slots'; expended: SpellSlotsExpended };

// Состояние персонажа до и после правки — для журнала.
export interface GameCharacterState {
  hitPointsCurrent: number;
  hitPointsMax: number;
  hitPointsTemp: number;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  spellSlots: SpellSlots;
}

export interface GameCharacterEffectInput {
  effectId: string;
}
