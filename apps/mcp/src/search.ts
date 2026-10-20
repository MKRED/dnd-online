import type { Character, CharacterKind } from 'shared';
import type { ApiCall } from './apiClient.js';
import {
  entityPath,
  ENTITY_KINDS,
  isCatalogKind,
  type CatalogKind,
  type EntityKind,
} from './entityKinds.js';

// Короткая строка поиска: модель по ней решает, чего не хватает, и берёт id для get.
// hidden — скрыто от других (у персонажа — доступ «только я»), link — персонаж открыт
// по ссылке, public — запись опубликована в каталоге.
export interface SearchHit {
  kind: EntityKind;
  id: string;
  name: string;
  category?: string;
  own: boolean;
  author?: string;
  visibility: 'hidden' | 'link' | 'public';
  hasImage: boolean;
}

export const SEARCH_LIMIT = 50;

// Поля, общие у записей всех каталогов в ответе списка.
interface CatalogListEntry {
  id: string;
  name: string;
  category?: string;
  authorNickname: string;
  isPublic: boolean;
  image: unknown;
}

// Без регистра и без разницы между «е» и «ё»: «ёж» находится по «еж».
const normalize = (value: string) =>
  value.toLocaleLowerCase('ru').replaceAll('ё', 'е');

async function searchCharacters(
  api: ApiCall,
  kinds: EntityKind[],
): Promise<SearchHit[]> {
  const wanted = new Set<CharacterKind>(
    kinds.flatMap((k) =>
      k === 'character' ? ['pc'] : k === 'npc' ? ['npc'] : [],
    ),
  );
  if (wanted.size === 0) return [];
  const list = await api<Character[]>(entityPath('character'));
  return list
    .filter((c) => wanted.has(c.kind))
    .map((c) => ({
      kind: c.kind === 'npc' ? 'npc' : 'character',
      id: c.id,
      name: c.name,
      own: true,
      visibility: c.linkAccess === 'link' ? 'link' : 'hidden',
      hasImage: c.mainImage !== null,
    }));
}

// Свои записи (и скрытые) плюс опубликованные чужие. Свои опубликованные приходят в
// обоих списках, поэтому чужие берём только те, которых нет среди своих.
async function searchCatalog(
  api: ApiCall,
  kind: CatalogKind,
): Promise<SearchHit[]> {
  const [mine, catalog] = await Promise.all(
    (['mine', 'catalog'] as const).map((scope) =>
      api<CatalogListEntry[]>(`${entityPath(kind)}?scope=${scope}`),
    ),
  );
  const mineIds = new Set(mine.map((e) => e.id));
  const hit = (e: CatalogListEntry, own: boolean): SearchHit => ({
    kind,
    id: e.id,
    name: e.name,
    ...(e.category ? { category: e.category } : {}),
    own,
    ...(own ? {} : { author: e.authorNickname }),
    visibility: e.isPublic ? 'public' : 'hidden',
    hasImage: e.image !== null,
  });
  return [
    ...mine.map((e) => hit(e, true)),
    ...catalog.filter((e) => !mineIds.has(e.id)).map((e) => hit(e, false)),
  ];
}

export async function searchEntities(
  api: ApiCall,
  kind: EntityKind | undefined,
  q: string | undefined,
) {
  const kinds = kind ? [kind] : [...ENTITY_KINDS];
  const groups = await Promise.all([
    searchCharacters(api, kinds),
    ...kinds.filter(isCatalogKind).map((k) => searchCatalog(api, k)),
  ]);
  const needle = q ? normalize(q.trim()) : '';
  const found = groups
    .flat()
    .filter((hit) => normalize(hit.name).includes(needle))
    .sort(
      (a, b) =>
        ENTITY_KINDS.indexOf(a.kind) - ENTITY_KINDS.indexOf(b.kind) ||
        a.name.localeCompare(b.name, 'ru'),
    );
  // Сколько нашлось каждого вида: обрезка идёт по порядку видов, и без счётчика модель
  // не узнала бы, что эффекты не влезли за способностями.
  const byKind: Partial<Record<EntityKind, number>> = {};
  for (const hit of found) byKind[hit.kind] = (byKind[hit.kind] ?? 0) + 1;
  return {
    total: found.length,
    byKind,
    shown: Math.min(found.length, SEARCH_LIMIT),
    results: found.slice(0, SEARCH_LIMIT),
  };
}
