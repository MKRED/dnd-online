import { ABILITY_SCORES, type AbilityScore } from './character.js';
import { ABILITY_GENITIVE } from './abilityUsageLabels.js';

// «Снимается спасброском» — общее поле эффекта, как длительность (docs/plan/effects.md):
// носитель повторяет спасбросок в начале или в конце каждого своего хода, успех снимает
// эффект. Так в книге у «Удержания личности» (конец хода) и «Палящей кары» (начало хода),
// docs/dnd/attacks-and-saves.md. Сл здесь нет: её даёт способность, наложившая эффект,
// а эффект, поставленный вручную, получит её в экземпляре.
export const SAVE_ENDS_EDGES = ['start', 'end'] as const;
export type SaveEndsEdge = (typeof SAVE_ENDS_EDGES)[number];

export type EffectSaveEnds = { ability: AbilityScore; edge: SaveEndsEdge };

// null — эффект спасброском не снимается.
export function isEffectSaveEnds(
  value: unknown,
): value is EffectSaveEnds | null {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    Object.keys(v).sort().join(',') === 'ability,edge' &&
    ABILITY_SCORES.includes(v.ability as AbilityScore) &&
    SAVE_ENDS_EDGES.includes(v.edge as SaveEndsEdge)
  );
}

// «Спасбросок Мудрости в конце каждого своего хода».
export function formatSaveEnds(saveEnds: EffectSaveEnds): string {
  const edge = saveEnds.edge === 'start' ? 'начале' : 'конце';
  return `Спасбросок ${ABILITY_GENITIVE[saveEnds.ability]} в ${edge} каждого своего хода`;
}
