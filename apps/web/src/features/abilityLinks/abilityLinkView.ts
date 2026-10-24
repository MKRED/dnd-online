import {
  formatActivation,
  formatCosts,
  formatEffectComponent,
  formatRecharge,
  pluralRu,
  type AbilityLink,
  type AbilityLinkCard,
} from 'shared';

// Строка способности на существе — персонаже или монстре; у каждого свои поля сверху
// (подготовка, «N/день»).
export type AbilityLinkEntry = AbilityLink & { id: string };

// Строка с карточкой — то, что можно сгруппировать.
export type CardEntry<E extends AbilityLinkEntry> = E & {
  ability: AbilityLinkCard;
};

export const hasCard = <E extends AbilityLinkEntry>(
  entry: E,
): entry is CardEntry<E> => entry.ability !== null;

// Группа строк под заголовком: «Действия», «Заговоры», «1/день».
export interface AbilityGroup<E extends AbilityLinkEntry> {
  key: string;
  title: string;
  entries: E[];
}

export function abilityEntryName(entry: AbilityLinkEntry): string {
  if (entry.ability) return entry.ability.name;
  return entry.missing === 'hidden'
    ? 'Способность скрыта автором'
    : 'Способность удалена автором';
}

// Короткая строка справа от названия. У умения активация уже в заголовке группы —
// оставляем только то, чего в заголовке нет: условие реакции, время применения и цену
// легендарного действия. У заклинания ячейку не пишем: её круг — заголовок или подпись.
function skillActivation({ activation }: AbilityLinkCard): string[] {
  switch (activation.kind) {
    case 'reaction':
    case 'free': {
      const trigger = activation.trigger.trim();
      return trigger ? [trigger] : [];
    }
    case 'time':
      return [formatActivation(activation)];
    case 'legendary':
      return activation.cost > 1
        ? [
            `стоит ${activation.cost} ${pluralRu(activation.cost, ['действие', 'действия', 'действий'])}`,
          ]
        : [];
    default:
      return [];
  }
}

export function abilitySummary(card: AbilityLinkCard): string {
  const parts =
    card.category === 'spell'
      ? [formatActivation(card.activation)]
      : skillActivation(card);
  const recharge =
    card.recharge === null ? [] : [formatRecharge(card.recharge)];
  const costs = formatCosts(
    card.category === 'spell' ? { ...card.costs, spellSlot: null } : card.costs,
  );
  // Что черта даёт всегда (docs/plan/done/traits.md): «Тёмное зрение, 120 фт.».
  const passive = card.passive.map(formatEffectComponent);
  return [...parts, ...recharge, ...passive, ...costs].join(' · ');
}
