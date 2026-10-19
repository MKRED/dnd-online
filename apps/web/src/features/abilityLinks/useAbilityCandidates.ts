import { useMemo } from 'react';
import { formatSpellLevel, type Ability, type AbilityCategory } from 'shared';
import { useAuth } from '../auth';
import { useCatalogList } from '../catalog';
import { abilitiesCatalog } from './abilityLinksApi';
import type { AbilityLinkEntry } from './abilityLinkView';

// Чьё окно: персонаж способности «Монстра» не берёт (сервер ответит 400), монстр берёт
// все категории, свою — первой (docs/plan/done/monsters-npcs.md, «Кто что добавляет»).
export type AbilityOwnerKind = 'character' | 'monster';

const FAILED = 'Не удалось загрузить способности';

const byName = (a: Ability, b: Ability) => a.name.localeCompare(b.name, 'ru');
const monsterFirst = (a: Ability, b: Ability) =>
  Number(b.category === 'monster') - Number(a.category === 'monster') ||
  byName(a, b);

// Круг рядом с названием: одноимённые способности различаются, а заклинание ищут по кругу.
const optionLabel = (ability: Ability) =>
  ability.category === 'spell'
    ? `${ability.name} · ${formatSpellLevel(ability.details.level).toLowerCase()}`
    : ability.name;

// Варианты для поиска в окне «Добавить способность»: «Мои способности» и «Каталог».
// Уже добавленные видны, но выбрать их нельзя: способность у существа — одна.
export function useAbilityCandidates(
  added: readonly AbilityLinkEntry[],
  owner: AbilityOwnerKind,
) {
  const { user } = useAuth();
  const mine = useCatalogList(abilitiesCatalog.list, 'mine', FAILED);
  const catalog = useCatalogList(abilitiesCatalog.list, 'catalog', FAILED);

  const result = useMemo(() => {
    if (!mine.entries || !catalog.entries || !user) return null;
    const taken = new Set(
      added.flatMap((e) => (e.ability ? [e.ability.id] : [])),
    );
    const option = (ability: Ability, label: string) => ({
      value: ability.id,
      label: taken.has(ability.id) ? `${label} · уже добавлена` : label,
      disabled: taken.has(ability.id),
    });
    const fits = (a: Ability) =>
      owner === 'monster' || a.category !== 'monster';
    const order = owner === 'monster' ? monsterFirst : byName;
    // Свои опубликованные есть в обоих списках, поэтому чужие берём по автору.
    const foreign = catalog.entries.filter((a) => a.authorId !== user.id);
    const options = [
      {
        group: 'Мои способности',
        items: mine.entries
          .filter(fits)
          .sort(order)
          .map((a) => option(a, optionLabel(a))),
      },
      {
        group: 'Каталог',
        items: foreign
          .filter(fits)
          .sort(order)
          .map((a) => option(a, `${optionLabel(a)} · ${a.authorNickname}`)),
      },
    ].filter((group) => group.items.length > 0);
    const categories = new Map<string, AbilityCategory>(
      [...mine.entries, ...foreign].map((a) => [a.id, a.category]),
    );
    return { options, categories };
  }, [mine.entries, catalog.entries, user, added, owner]);

  return {
    loaded: result !== null,
    options: result?.options ?? [],
    categoryOf: (id: string) => result?.categories.get(id),
    error: mine.error ?? catalog.error,
  };
}
