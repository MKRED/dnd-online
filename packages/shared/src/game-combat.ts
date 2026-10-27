import type { D20Roll, RollMode } from './d20Roll.js';

// Очерёдность боя на активной сцене (docs/plan/combat.md, этап 2; правила —
// docs/dnd/combat.md). Участник — фигурка персонажа или монстр/НПС сцены. Сначала все
// бросают инициативу, потом ходят по очереди; новичок встаёт в очередь по своему числу.

// Участник по тому, кто он на сцене: фигурка — персонаж, существо — объект сцены.
export type CombatantRef =
  | { kind: 'figure'; characterId: string }
  | { kind: 'creature'; objectId: number };

export type CombatantInput = CombatantRef & { surprised: boolean };

export interface GameCombatant {
  id: string;
  ref: CombatantRef;
  name: string;
  // Итог инициативы; null — ещё не бросал, в очереди его нет.
  initiative: number | null;
  // Врасплох — помеха на бросок инициативы. Игрокам — только у партии.
  surprised: boolean;
  // Смотрящий бросает за него: мастер — за всех, игрок — за фигурку, которую водит.
  canRoll: boolean;
  // Бросок инициативы со слагаемыми — мастеру и тем, кто водит фигурку; иначе null.
  roll: D20Roll | null;
}

// Кого ещё можно позвать в бой (окно «Начать бой» и «В бой» у мастера). seen — видит ли
// его партия: такие отмечены по умолчанию.
export type CombatCandidate = CombatantRef & { name: string; seen: boolean };

export interface GameCombat {
  sceneId: string;
  // Номер раунда; null — боя нет (свободный режим).
  round: number | null;
  // Участники по очереди хода; не бросившие — в конце, в порядке, как их позвали.
  combatants: GameCombatant[];
  // Чей ход; null — очереди нет или инициатива ещё бросается. Игроку — null и тогда,
  // когда ходит скрытое от него существо.
  turn: string | null;
  // Только мастеру: существа и фигурки сцены не в бою; игрокам — пусто.
  candidates: CombatCandidate[];
  // Номер журнала на момент чтения, как у фигурок.
  eventSeq: number;
}

// Ответ на бросок: сам бросок для окна и очередь после него.
export interface GameCombatRoll {
  roll: D20Roll;
  combat: GameCombat;
}

export interface CombatStartInput {
  participants: CombatantInput[];
}

// Бросок инициативы; mode — переключатель мастера (игроку нельзя).
export interface CombatRollInput {
  mode?: RollMode;
}

// Участник в записи журнала, как он звался в тот момент.
export interface GameEventCombatant {
  id: string;
  name: string;
  ref: CombatantRef;
}
