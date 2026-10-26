import {
  ABILITY_ACTIVATION_KINDS,
  ACTIVATION_LABELS,
  SPELL_SLOT_CIRCLES,
  type AbilityActivationKind,
  type CharacterAbilityEntry,
  type SpellSlots,
} from 'shared';
import { hasCard, type AbilityGroup, type CardEntry } from '../../abilityLinks';

// Заголовки групп «Умений». «Время» в карточке — поле формы, на листе понятнее так.
const GROUP_TITLES: Record<AbilityActivationKind, string> = {
  ...ACTIVATION_LABELS,
  time: 'Долгое применение',
  trait: 'Черты',
};

// Черты — первой группой, как на карточке монстра (docs/plan/done/traits.md): то, что
// есть всегда, читают раньше того, что применяют. Остальные — в порядке
// ABILITY_ACTIVATION_KINDS.
const GROUP_ORDER: AbilityActivationKind[] = [
  'trait',
  ...ABILITY_ACTIVATION_KINDS.filter((kind) => kind !== 'trait'),
];

// «Умения» — по активации, пустые группы не показываются. Скрытые и удалённые —
// отдельной группой в конце: их категория не видна.
// Способность «Монстра» персонажу не добавить, но она бывает, если автор сменил
// категорию уже добавленной, — тогда она тоже в «Умениях», по своей активации.
export function skillGroups(entries: readonly CharacterAbilityEntry[]) {
  const skills = entries
    .filter(hasCard)
    .filter((e) => e.ability.category !== 'spell');
  const groups: AbilityGroup<CharacterAbilityEntry>[] = GROUP_ORDER.map(
    (kind) => ({
      key: kind,
      title: GROUP_TITLES[kind],
      entries: skills.filter((e) => e.ability.activation.kind === kind),
    }),
  );
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
  entries: CardEntry<CharacterAbilityEntry>[];
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
