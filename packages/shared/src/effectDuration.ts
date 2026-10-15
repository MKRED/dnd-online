// Длительность эффекта — общее поле всех эффектов (docs/plan/effects.md). Формы
// длительности — по книге 2024 (docs/dnd/durations.md), «до отдыха» — домашнее правило.
// Это длительность образца: оставшееся время будет у наложенного на персонажа эффекта.
// «Мгновенно» нет: эффект в каталоге — то, что держится на существе.

export const DURATION_UNITS = ['round', 'minute', 'hour', 'day'] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

// Начало или конец хода.
export const DURATION_TURN_EDGES = ['start', 'end'] as const;
export type DurationTurnEdge = (typeof DURATION_TURN_EDGES)[number];

// Чей ход: того, кто наложил эффект (так в книге: «до начала вашего следующего хода» у
// заклинания на цель), или того, на ком эффект.
export const DURATION_TURN_OWNERS = ['creator', 'bearer'] as const;
export type DurationTurnOwner = (typeof DURATION_TURN_OWNERS)[number];

// short — короткий или длинный отдых (длинный тоже снимает), long — только длинный.
export const DURATION_RESTS = ['short', 'long'] as const;
export type DurationRest = (typeof DURATION_RESTS)[number];

export const DURATION_AMOUNT_MAX = 999;

export type EffectDuration =
  // Пока не снимут: постоянные черты, «пока не рассеют».
  | { kind: 'permanent' }
  // В книге концентрация бывает только у времени: «Концентрация, вплоть до 1 минуты».
  | {
      kind: 'time';
      amount: number;
      unit: DurationUnit;
      concentration: boolean;
    }
  | { kind: 'turn'; edge: DurationTurnEdge; owner: DurationTurnOwner }
  | { kind: 'rest'; rest: DurationRest };

export type EffectDurationKind = EffectDuration['kind'];
export const EFFECT_DURATION_KINDS = [
  'permanent',
  'time',
  'turn',
  'rest',
] as const satisfies readonly EffectDurationKind[];

// Длительность записей, у которых её ещё не было, и значение по умолчанию в форме.
export const DEFAULT_EFFECT_DURATION: EffectDuration = { kind: 'permanent' };

const isOneOf = <T extends string>(list: readonly T[], value: unknown) =>
  list.includes(value as T);

// Проверка тела запроса и jsonb из базы: только известные поля и значения.
export function isEffectDuration(value: unknown): value is EffectDuration {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const keys = Object.keys(v).sort().join(',');
  switch (v.kind) {
    case 'permanent':
      return keys === 'kind';
    case 'time':
      return (
        keys === 'amount,concentration,kind,unit' &&
        Number.isInteger(v.amount) &&
        (v.amount as number) >= 1 &&
        (v.amount as number) <= DURATION_AMOUNT_MAX &&
        isOneOf(DURATION_UNITS, v.unit) &&
        typeof v.concentration === 'boolean'
      );
    case 'turn':
      return (
        keys === 'edge,kind,owner' &&
        isOneOf(DURATION_TURN_EDGES, v.edge) &&
        isOneOf(DURATION_TURN_OWNERS, v.owner)
      );
    case 'rest':
      return keys === 'kind,rest' && isOneOf(DURATION_RESTS, v.rest);
    default:
      return false;
  }
}
