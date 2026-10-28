import {
  attackCover,
  boxDistance,
  cellsToFeet,
  type Cover,
  type MapState,
} from 'shared';
import type { Fighter } from './attack-fighters.js';

// Где стоят атакующий и цель (docs/plan/combat.md, этап 5): расстояние в футах до
// ближайшей клетки, укрытие лучом «эффект» и враг вплотную для дальнобойной атаки.

export const distanceFt = (a: Fighter, b: Fighter) =>
  cellsToFeet(boxDistance(a.cells, b.cells));

// Укрытие — лучом «эффект», как у атак в плане карты: оно про то, долетит ли удар,
// а не видно ли цель (map.md, «Линия видимости и укрытие»).
export const coverBetween = (map: MapState, a: Fighter, b: Fighter): Cover =>
  attackCover(map, a.body, b.body, 'effect');

const CLOSE_FT = 5;

// Ranged Attacks in Close Combat: в 5 фт. враг, который видит атакующего и не
// Недееспособен. Враг героя — монстр или НПС, не повержен и не скрыт мастером: скрытого
// игрок не видит, и помеха от него выдала бы засаду. Видит ли — пока по состояниям.
export function enemyClose(attacker: Fighter, fighters: readonly Fighter[]) {
  return fighters.some(
    (f) =>
      f.party !== attacker.party &&
      !f.down &&
      !f.hidden &&
      !f.conditions.has('incapacitated') &&
      !f.conditions.has('blinded') &&
      !attacker.conditions.has('invisible') &&
      distanceFt(attacker, f) <= CLOSE_FT,
  );
}
