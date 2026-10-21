import type { CreatureHealth } from 'shared';

// Как существо стоит на карте по здоровью (docs/dnd/hit-points.md, «Что видят другие»):
// живое — карточка стоит; персонаж без сознания — карточка лежит в своей клетке (его ещё
// можно спасти); поверженный монстр или НПС и погибший персонаж — гроб с портретом на
// крышке и призраком над ним.
export type CreaturePose = 'standing' | 'lying' | 'coffin';

export function creaturePose(
  health: CreatureHealth | null | undefined,
  pc: boolean,
): CreaturePose {
  if (health === 'dead' || (health === 'down' && !pc)) return 'coffin';
  if (health === 'down') return 'lying';
  return 'standing';
}

// Лежащая карточка ужимается до своего места: целиком — в квадрате места с полями, а не
// во всю высоту существа поперёк соседних клеток.
export function lyingScale(cardHeight: number, footprint: number): number {
  return Math.min(1, (footprint * 0.9) / cardHeight);
}

export interface CoffinSize {
  length: number;
  width: number;
  height: number;
}

// Гроб — во всё место существа вдоль взгляда, низкий: из-за него не прячутся соседи.
export function coffinSize(footprint: number): CoffinSize {
  const length = footprint * 0.85;
  return { length, width: length * 0.42, height: 0.06 + footprint * 0.1 };
}

// Призрак над гробом растёт с местом существа: над Огромным — огромный (решено
// с пользователем 2026-10-21). Парит на gap над крышкой и качается на sway вверх-вниз.
export const SPIRIT_GAP = 0.15;
export const SPIRIT_SWAY = 0.06;

export function spiritSize(footprint: number): {
  width: number;
  height: number;
} {
  const width = footprint * 0.5;
  return { width, height: width * 1.3 };
}

// Верх существа в позе над его ногами — над ним встаёт метка здоровья. standing — рост
// стоящей карточки; лежащая карточка — плоская, её верх у пола.
export function poseTop(
  pose: CreaturePose,
  footprint: number,
  standing: number,
): number {
  if (pose === 'standing') return standing;
  if (pose === 'lying') return 0.05;
  return (
    coffinSize(footprint).height +
    SPIRIT_GAP +
    spiritSize(footprint).height +
    SPIRIT_SWAY
  );
}

// Контур гроба сверху — классический шестиугольник: узкое изголовье к −z (гроб
// разворачивают ногами по взгляду — Coffin),
// шире всего у плеч, сужение к ногам. Точки (x, z) по часовой стрелке.
export function coffinOutline({
  length,
  width,
}: CoffinSize): [number, number][] {
  const head = -length / 2;
  const shoulders = head + length * 0.28;
  const feet = length / 2;
  return [
    [-width * 0.3, head],
    [width * 0.3, head],
    [width / 2, shoulders],
    [width * 0.35, feet],
    [-width * 0.35, feet],
    [-width / 2, shoulders],
  ];
}
