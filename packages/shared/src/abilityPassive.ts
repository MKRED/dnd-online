import type { AbilityLink } from './abilityLinks.js';
import type { AbilityActivation } from './abilityUsage.js';
import type { AppliedEffect } from './effectSpeedTotal.js';

// Пассивная черта (docs/plan/done/traits.md): способность с активацией «Черта» сама
// меняет лист владельца — теми же составляющими, что у эффекта. В отличие от эффекта,
// черта есть у существа всегда: она входит в его базу, и вид листа «Без эффектов» её
// не убирает.

// Составляющие бывают только у черты; пустой список подходит любой активации.
export const passiveFitsActivation = (
  activation: AbilityActivation,
  passive: readonly unknown[],
) => passive.length === 0 || activation.kind === 'trait';

type AbilityLinkEntry = { id: string } & AbilityLink;

// Черты существа как наложенные эффекты: источник — id способности, чтобы итог листа
// назвал строку её именем. Действует то, что видит владелец (как у эффекта): скрытая
// или удалённая автором черта на лист не влияет.
export function traitEffects(
  entries: readonly AbilityLinkEntry[],
): (AppliedEffect & { name: string })[] {
  return entries.flatMap((entry) =>
    entry.ability &&
    !entry.inactive &&
    entry.ability.activation.kind === 'trait' &&
    entry.ability.passive.length > 0
      ? [
          {
            source: entry.ability.id,
            name: entry.ability.name,
            components: entry.ability.passive,
          },
        ]
      : [],
  );
}
