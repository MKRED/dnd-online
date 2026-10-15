// Составляющая эффекта «Чувство» (docs/plan/effects.md, effectComponents.ts): вид чувства
// и дистанция в футах.
// Виды и дистанции — по книге 2024 (docs/dnd/senses.md). Ключи хранятся в базе:
// добавлять новые можно, переименовывать — только с миграцией данных.
export const SENSE_KINDS = [
  'darkvision',
  'blindsight',
  'tremorsense',
  'truesight',
  // Не из глоссария: воззвание колдуна и заклинание.
  'devils_sight',
  'see_invisible',
] as const;
export type SenseKind = (typeof SENSE_KINDS)[number];

// «Видение невидимого» действует везде, куда персонаж смотрит, — дистанции у него нет.
// У остальных она обязательна: забытое поле не должно давать чувство без предела.
export const RANGELESS_SENSES: readonly SenseKind[] = ['see_invisible'];

export const senseHasRange = (sense: SenseKind) =>
  !RANGELESS_SENSES.includes(sense);

// Футы кратны 5: на карте клетка — 5 фт. Самое большое в книге — 150 фт. у заклинания
// «Тёмное зрение».
export const SENSE_RANGE_STEP = 5;
export const SENSE_RANGE_MAX = 1000;

export type SenseDetails = { sense: SenseKind; range: number | null };

export function isSenseDetails(value: unknown): value is SenseDetails {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(',') !== 'range,sense') return false;
  if (!SENSE_KINDS.includes(v.sense as SenseKind)) return false;
  if (!senseHasRange(v.sense as SenseKind)) return v.range === null;
  const range = v.range;
  return (
    Number.isInteger(range) &&
    (range as number) >= SENSE_RANGE_STEP &&
    (range as number) <= SENSE_RANGE_MAX &&
    (range as number) % SENSE_RANGE_STEP === 0
  );
}

// Названия — как в переводе next.dnd.su.
export const SENSE_LABELS: Record<SenseKind, string> = {
  darkvision: 'Тёмное зрение',
  blindsight: 'Слепое зрение',
  tremorsense: 'Чувство вибрации',
  truesight: 'Истинное зрение',
  devils_sight: 'Дьявольское зрение',
  see_invisible: 'Видение невидимого',
};

// «Тёмное зрение, 60 фт.», «Видение невидимого».
export function formatSense(details: SenseDetails): string {
  const label = SENSE_LABELS[details.sense];
  return details.range === null ? label : `${label}, ${details.range} фт.`;
}
