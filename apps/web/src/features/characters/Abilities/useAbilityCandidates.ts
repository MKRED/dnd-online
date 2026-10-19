import { useMemo } from 'react';
import {
  formatSpellLevel,
  type Ability,
  type CharacterAbilityEntry,
} from 'shared';
import { useAuth } from '../../auth';
import { useCatalogList } from '../../catalog';
import { abilitiesCatalog } from './abilitiesApi';

const FAILED = 'Не удалось загрузить способности';

const byName = (a: Ability, b: Ability) => a.name.localeCompare(b.name, 'ru');

// Круг рядом с названием: одноимённые способности различаются, а заклинание ищут по кругу.
const optionLabel = (ability: Ability) =>
  ability.category === 'spell'
    ? `${ability.name} · ${formatSpellLevel(ability.details.level).toLowerCase()}`
    : ability.name;

// Варианты для поиска в окне «Добавить способность»: «Мои способности» и «Каталог».
// Уже добавленные видны, но выбрать их нельзя: способность у персонажа — одна.
export function useAbilityCandidates(added: readonly CharacterAbilityEntry[]) {
  const { user } = useAuth();
  const mine = useCatalogList(abilitiesCatalog.list, 'mine', FAILED);
  const catalog = useCatalogList(abilitiesCatalog.list, 'catalog', FAILED);

  const options = useMemo(() => {
    if (!mine.entries || !catalog.entries || !user) return null;
    const taken = new Set(
      added.flatMap((e) => (e.ability ? [e.ability.id] : [])),
    );
    const option = (ability: Ability, label: string) => ({
      value: ability.id,
      label: taken.has(ability.id) ? `${label} · уже добавлена` : label,
      disabled: taken.has(ability.id),
    });
    // Способности «Монстра» персонажу не добавляются (сервер ответит 400).
    const fits = (a: Ability) => a.category !== 'monster';
    // Свои опубликованные есть в обоих списках, поэтому чужие берём по автору.
    return [
      {
        group: 'Мои способности',
        items: mine.entries
          .filter(fits)
          .sort(byName)
          .map((a) => option(a, optionLabel(a))),
      },
      {
        group: 'Каталог',
        items: catalog.entries
          .filter((a) => fits(a) && a.authorId !== user.id)
          .sort(byName)
          .map((a) => option(a, `${optionLabel(a)} · ${a.authorNickname}`)),
      },
    ].filter((group) => group.items.length > 0);
  }, [mine.entries, catalog.entries, user, added]);

  return {
    loaded: options !== null,
    options: options ?? [],
    error: mine.error ?? catalog.error,
  };
}
