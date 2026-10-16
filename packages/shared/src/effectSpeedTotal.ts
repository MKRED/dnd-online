import { expandConditions } from './conditionsExpand.js';
import type { EffectComponent } from './effectComponents.js';
import type { SpeedDetails } from './effectSpeed.js';

// Итоговая Скорость существа по базе и наложенным эффектам — первый вычислитель движка
// (docs/plan/effects-coverage.md, пункт 2; правила — docs/dnd/combining-effects.md).

export type SpecialSpeed = 'fly' | 'climb' | 'swim' | 'burrow';
type SpecialSpeeds = Partial<Record<SpecialSpeed, number>>;

// Эффект на существе. source — запись каталога, из которой он пришёл: одно и то же
// заклинание дважды не складывается.
export type AppliedEffect = {
  source: string;
  components: readonly EffectComponent[];
};

// База — без эффектов: Скорость и особые скорости самого существа.
export type SpeedBase = {
  speed: number;
  special?: SpecialSpeeds;
  hover?: boolean;
};

export type SpeedTotal = {
  speed: number;
  special: SpecialSpeeds;
  hover: boolean;
};

const SPECIAL: readonly SpecialSpeed[] = ['fly', 'climb', 'swim', 'burrow'];

// Сводка изменений обычной Скорости: сумма ±N, степень двойки (×2 — +1, ×½ — −1)
// и «становится 0».
type Modifier = { shift: number; power: number; zero: boolean };

// Одно заклинание дважды не складывается: по книге действует сильнейший экземпляр,
// при равных — последний. Пока экземпляры одной записи одинаковы (рост с ячейкой ещё
// не сделан, пробел К), достаточно оставить последний. Состояния сначала раскрываются
// в свои составляющие: «Схваченный» — это Скорость 0.
function speedChanges(effects: readonly AppliedEffect[]): SpeedDetails[] {
  const bySource = new Map<string, AppliedEffect>();
  for (const effect of expandConditions(effects)) {
    bySource.set(effect.source, effect);
  }
  return [...bySource.values()].flatMap((effect) =>
    effect.components.flatMap((c) => (c.kind === 'speed' ? [c] : [])),
  );
}

function modifierOf(changes: readonly SpeedDetails[]): Modifier {
  const m: Modifier = { shift: 0, power: 0, zero: false };
  for (const { change, feet } of changes) {
    if (change === 'faster') m.shift += feet ?? 0;
    if (change === 'slower') m.shift -= feet ?? 0;
    if (change === 'double') m.power += 1;
    if (change === 'half') m.power -= 1;
    if (change === 'zero') m.zero = true;
  }
  return m;
}

// Порядок решён с пользователем 2026-10-16 (книга молчит): сначала все ±N (не ниже 0),
// потом ×2 и ×½, последним «0» — поэтому после него Скорость ничем не растёт (так
// и работают «Скорость 0 и не может увеличиться» у состояний). Округление вниз до
// целого, не до 5 фт. Одна степень двойки с одним округлением в конце — то же, что
// сначала все ×2, потом все ×½: 25 с Haste и Slow остаётся 25, а не 24.
function applyModifier(feet: number, m: Modifier): number {
  if (m.zero) return 0;
  const shifted = Math.max(0, feet + m.shift);
  return m.power >= 0
    ? shifted * 2 ** m.power
    : Math.floor(shifted / 2 ** -m.power);
}

export function totalSpeed(
  base: SpeedBase,
  effects: readonly AppliedEffect[],
): SpeedTotal {
  const changes = speedChanges(effects);
  const m = modifierOf(changes);
  const speed = applyModifier(base.speed, m);

  // Изменение Скорости меняет и особые скорости — той же операцией (решено
  // с пользователем 2026-10-16: Полёт 60 под Haste — 120). «Равна Скорости» берётся
  // от итога. Одна особая скорость из нескольких источников не складывается: действует
  // наибольшая.
  const special: SpecialSpeeds = {};
  for (const kind of SPECIAL) {
    const own = base.special?.[kind];
    const candidates = own === undefined ? [] : [applyModifier(own, m)];
    for (const grant of changes) {
      if (grant.change !== kind) continue;
      candidates.push(
        grant.feet === null ? speed : applyModifier(grant.feet, m),
      );
    }
    if (candidates.length > 0) special[kind] = Math.max(...candidates);
  }

  // Парит, если парение даёт хоть один источник полёта.
  const hover =
    special.fly !== undefined &&
    ((base.hover === true && base.special?.fly !== undefined) ||
      changes.some((c) => c.change === 'fly' && c.hover));
  return { speed, special, hover };
}
