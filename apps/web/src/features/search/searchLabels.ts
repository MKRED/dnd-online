import {
  EFFECT_COMPONENT_LABELS,
  MONSTER_TYPE_LABELS,
  type SearchGroup,
  type SearchKind,
} from 'shared';
import { CLASS_LABELS } from '../characters';
import { ABILITIES, EFFECTS } from '../simpleCatalog';
import {
  CATEGORY_LABELS as ITEM_CATEGORY_LABELS,
  formatCost,
} from '../items/itemLabels';

// Подписи групп — как разделы в боковой панели.
export const SEARCH_GROUP_LABELS: Record<SearchKind, string> = {
  ability: 'Способности',
  monster: 'Монстры',
  character: 'Персонажи',
  item: 'Предметы',
  effect: 'Эффекты',
  map: 'Карты',
};

const PATHS: Record<SearchKind, string> = {
  ability: ABILITIES.path,
  monster: '/monsters',
  character: '/characters',
  item: '/items',
  effect: EFFECTS.path,
  map: '/maps',
};

export function searchHitPath(kind: SearchKind, id: string): string {
  return `${PATHS[kind]}/${id}`;
}

type Hits<K extends SearchKind> = Extract<SearchGroup, { kind: K }>['hits'];

const lower = (label: string) => label.toLowerCase();

const abilityDetail = (hit: Hits<'ability'>[number]) => {
  if (hit.category === 'spell') {
    return hit.spellLevel ? `заклинание · ${hit.spellLevel} круг` : 'заговор';
  }
  if (hit.category === 'feature') return 'умение';
  return hit.category === 'monster' ? 'способность монстра' : 'способность';
};

const characterDetail = (hit: Hits<'character'>[number]) =>
  hit.characterKind === 'npc'
    ? 'НПС'
    : hit.classes.map((c) => `${CLASS_LABELS[c.class]} ${c.level}`).join(' / ');

// Составляющих бывает несколько; хватит первой, остальные — числом.
const effectDetail = (hit: Hits<'effect'>[number]) => {
  const [first, ...rest] = hit.components;
  if (!first) return 'эффект';
  const label = lower(EFFECT_COMPONENT_LABELS[first]);
  return rest.length > 0 ? `${label} и ещё ${rest.length}` : label;
};

// Подписи справа от названий группы: чем запись отличается от соседних с похожим именем.
// switch, а не таблица по kind: так TypeScript знает тип записей каждой группы.
export function searchHitDetails(group: SearchGroup): string[] {
  switch (group.kind) {
    case 'ability':
      return group.hits.map(abilityDetail);
    case 'monster':
      return group.hits.map(
        (hit) =>
          `${lower(MONSTER_TYPE_LABELS[hit.type])} · ПО ${hit.challenge}`,
      );
    case 'character':
      return group.hits.map(characterDetail);
    case 'item':
      return group.hits.map((hit) =>
        [
          lower(ITEM_CATEGORY_LABELS[hit.category]),
          hit.cost && formatCost(hit.cost),
        ]
          .filter(Boolean)
          .join(' · '),
      );
    case 'effect':
      return group.hits.map(effectDetail);
    case 'map':
      return group.hits.map((hit) => `${hit.width}×${hit.depth}`);
  }
}

// Страница со всеми результатами; kind — сразу на одном разделе.
export function searchPagePath(q: string, kind?: SearchKind): string {
  const params = new URLSearchParams({ q });
  if (kind) params.set('kind', kind);
  return `/search?${params}`;
}
