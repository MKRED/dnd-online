import {
  DURATION_AMOUNT_MAX,
  DURATION_UNITS,
  type DurationUnit,
} from './effectDuration.js';
import { SPELL_SLOT_LEVEL_MAX, type AbilityCosts } from './abilityUsage.js';

// Поля категории «Заклинание» (docs/plan/abilities.md, этап 6; правила —
// docs/dnd/spells.md). Механика — общий блок «Применение», время накладывания — общая
// «Активация»; здесь только то, чего нет у других способностей.

// Круг: 0 — заговор.
export const SPELL_LEVEL_MAX = SPELL_SLOT_LEVEL_MAX;

export const SPELL_SCHOOLS = [
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
] as const;
export type SpellSchool = (typeof SPELL_SCHOOLS)[number];

// Компоненты — текст, как строка книги: «В, С, М (…)» (решено с пользователем).
export const SPELL_COMPONENTS_MAX_LENGTH = 500;

// Строка «Длительность» книги. В отличие от длительности эффекта есть «Мгновенная»:
// заклинание бывает и мгновенным. «Пока не рассеется или сработает» — «Пока не
// рассеется» с правилом в описании.
export type SpellDuration =
  | { kind: 'instant' }
  | {
      kind: 'time';
      amount: number;
      unit: DurationUnit;
      concentration: boolean;
    }
  | { kind: 'dispelled' }
  | { kind: 'special' };
export type SpellDurationKind = SpellDuration['kind'];
export const SPELL_DURATION_KINDS = [
  'instant',
  'time',
  'dispelled',
  'special',
] as const satisfies readonly SpellDurationKind[];

export interface SpellDetails {
  level: number;
  school: SpellSchool;
  components: string;
  ritual: boolean;
  duration: SpellDuration;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const keysAre = (value: Record<string, unknown>, keys: string) =>
  Object.keys(value).sort().join(',') === keys;

const isIntIn = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;

function isSpellDuration(value: unknown): value is SpellDuration {
  if (!isObject(value)) return false;
  if (value.kind === 'time')
    return (
      keysAre(value, 'amount,concentration,kind,unit') &&
      isIntIn(value.amount, 1, DURATION_AMOUNT_MAX) &&
      DURATION_UNITS.includes(value.unit as DurationUnit) &&
      typeof value.concentration === 'boolean'
    );
  return (
    keysAre(value, 'kind') &&
    SPELL_DURATION_KINDS.includes(value.kind as SpellDurationKind)
  );
}

// Проверка тела запроса и jsonb из базы. Ритуал — только с 1 круга: у заговора и так
// нет ячейки, которую ритуал бережёт.
export function isSpellDetails(value: unknown): value is SpellDetails {
  if (!isObject(value)) return false;
  if (!keysAre(value, 'components,duration,level,ritual,school')) return false;
  return (
    isIntIn(value.level, 0, SPELL_LEVEL_MAX) &&
    SPELL_SCHOOLS.includes(value.school as SpellSchool) &&
    typeof value.components === 'string' &&
    value.components.length <= SPELL_COMPONENTS_MAX_LENGTH &&
    typeof value.ritual === 'boolean' &&
    (!value.ritual || (value.level as number) >= 1) &&
    isSpellDuration(value.duration)
  );
}

// Затрата «Ячейка заклинаний» у заклинания: у заговора её нет, у остальных — ровно его
// круга («или выше» уже в самой затрате) или нет вовсе (сотворяют от черты без ячейки).
export function spellSlotFits(level: number, costs: AbilityCosts): boolean {
  const slot = costs.spellSlot;
  if (slot === null) return true;
  return level >= 1 && slot.minLevel === level;
}
