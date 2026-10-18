// Составляющая эффекта «Класс доспеха» (docs/plan/done/effects.md, этап 7.6;
// docs/dnd/modifiers.md). По книге 2024: Shield of Faith и Haste (+2), Shield (+5),
// Slow (−2), Barkskin (КД 17, если он ниже), Mage Armor (базовый КД 13 + модификатор
// Ловкости). Ключи хранятся в базе: добавлять можно, переименовывать — только с миграцией
// данных.
export const ARMOR_CLASS_CHANGES = [
  'bonus',
  'penalty',
  'minimum',
  'base',
] as const;
export type ArmorClassChange = (typeof ARMOR_CLASS_CHANGES)[number];

export const ARMOR_CLASS_CHANGE_LABELS: Record<ArmorClassChange, string> = {
  bonus: 'Больше на N',
  penalty: 'Меньше на N',
  minimum: 'Не ниже N',
  base: 'Базовый: N + Ловкость',
};

// Пределы с запасом против книги: самый большой бонус — +5 у Shield, «не ниже» — 17
// у Barkskin, база — 13 у Mage Armor.
export const ARMOR_CLASS_LIMITS: Record<
  ArmorClassChange,
  { min: number; max: number }
> = {
  bonus: { min: 1, max: 10 },
  penalty: { min: 1, max: 10 },
  minimum: { min: 10, max: 30 },
  base: { min: 10, max: 20 },
};

export type ArmorClassDetails = { change: ArmorClassChange; value: number };

export const isArmorClassValue = (change: ArmorClassChange, value: unknown) =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= ARMOR_CLASS_LIMITS[change].min &&
  value <= ARMOR_CLASS_LIMITS[change].max;

export function isArmorClassDetails(
  value: unknown,
): value is ArmorClassDetails {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(',') !== 'change,value') return false;
  if (!ARMOR_CLASS_CHANGES.includes(v.change as ArmorClassChange)) return false;
  return isArmorClassValue(v.change as ArmorClassChange, v.value);
}

// В эффекте один сдвиг КД (больше или меньше — вместе они бессмысленны), одно «не ниже»
// и одна база: как складываются два одинаковых в одном эффекте, книга не говорит.
export const armorClassKey = ({ change }: ArmorClassDetails) =>
  change === 'bonus' || change === 'penalty' ? 'shift' : change;

// «КД +2», «КД не ниже 17», «Базовый КД 13 + модификатор Ловкости».
export function formatArmorClass({ change, value }: ArmorClassDetails): string {
  switch (change) {
    case 'bonus':
      return `КД +${value}`;
    case 'penalty':
      return `КД −${value}`;
    case 'minimum':
      return `КД не ниже ${value}`;
    case 'base':
      return `Базовый КД ${value} + модификатор Ловкости`;
    default:
      return change satisfies never;
  }
}
