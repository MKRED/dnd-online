import {
  ABILITY_ACTIVATION_KINDS,
  ACTIVATION_LABELS,
  formatActivation,
  formatCosts,
  SPELL_SLOT_CIRCLES,
  type AbilityActivationKind,
  type CharacterAbilityCard,
  type CharacterAbilityEntry,
  type SpellSlots,
} from 'shared';

// Строка с карточкой — то, что можно сгруппировать.
export type CardEntry = CharacterAbilityEntry & {
  ability: CharacterAbilityCard;
};

const hasCard = (entry: CharacterAbilityEntry): entry is CardEntry =>
  entry.ability !== null;

export interface SkillGroup {
  key: AbilityActivationKind | 'missing';
  title: string;
  entries: CharacterAbilityEntry[];
}

// Заголовки групп «Умений». «Время» в карточке — поле формы, на листе понятнее так.
const GROUP_TITLES: Record<AbilityActivationKind, string> = {
  ...ACTIVATION_LABELS,
  time: 'Долгое применение',
};

// «Умения» — по активации в порядке ABILITY_ACTIVATION_KINDS, пустые группы не
// показываются. Скрытые и удалённые — отдельной группой в конце: их категория не видна.
// Способность «Монстра» персонажу не добавить, но она бывает, если автор сменил
// категорию уже добавленной, — тогда она тоже в «Умениях», по своей активации.
export function skillGroups(entries: readonly CharacterAbilityEntry[]) {
  const skills = entries
    .filter(hasCard)
    .filter((e) => e.ability.category !== 'spell');
  const groups: SkillGroup[] = ABILITY_ACTIVATION_KINDS.map((kind) => ({
    key: kind,
    title: GROUP_TITLES[kind],
    entries: skills.filter((e) => e.ability.activation.kind === kind),
  }));
  groups.push({
    key: 'missing',
    title: 'Недоступны',
    entries: entries.filter((e) => !hasCard(e)),
  });
  return groups.filter((group) => group.entries.length > 0);
}

export interface SpellCircle {
  // 0 — заговоры.
  level: number;
  entries: CardEntry[];
}

// «Заклинания» по кругам: заговоры, затем 1–9. Круг виден, если в нём есть заклинания
// или ячейки: ячейки бывают и до того, как заклинания добавлены.
export function spellCircles(
  entries: readonly CharacterAbilityEntry[],
  slots: SpellSlots,
): SpellCircle[] {
  const spells = entries
    .filter(hasCard)
    .filter((e) => e.ability.category === 'spell');
  return [0, ...SPELL_SLOT_CIRCLES]
    .map((level) => ({
      level,
      entries: spells.filter((e) => e.ability.level === level),
    }))
    .filter(
      ({ level, entries: inCircle }) =>
        inCircle.length > 0 ||
        (level > 0 && (slots[level as 1]?.total ?? 0) > 0),
    );
}

export function abilityEntryName(entry: CharacterAbilityEntry): string {
  if (entry.ability) return entry.ability.name;
  return entry.missing === 'hidden'
    ? 'Способность скрыта автором'
    : 'Способность удалена автором';
}

// Короткая строка справа от названия. У умения активация уже в заголовке группы —
// оставляем только то, чего в заголовке нет: условие реакции и время применения.
// У заклинания ячейку не пишем: её круг — заголовок, в котором стоит заклинание.
function skillActivation({ activation }: CharacterAbilityCard): string[] {
  switch (activation.kind) {
    case 'reaction':
    case 'free': {
      const trigger = activation.trigger.trim();
      return trigger ? [trigger] : [];
    }
    case 'time':
      return [formatActivation(activation)];
    default:
      return [];
  }
}

export function abilitySummary(card: CharacterAbilityCard): string {
  const parts =
    card.category === 'spell'
      ? [formatActivation(card.activation)]
      : skillActivation(card);
  const costs = formatCosts(
    card.category === 'spell' ? { ...card.costs, spellSlot: null } : card.costs,
  );
  return [...parts, ...costs].join(' · ');
}
