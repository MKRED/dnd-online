import type { AbilityCategory } from './abilities.js';
import type { CharacterClassLevel, CharacterKind } from './character.js';
import type { EffectComponentKind } from './effectComponents.js';
import type { ItemCategory, ItemCost } from './items.js';
import type { MonsterChallenge } from './monsterChallenge.js';
import type { MonsterType } from './monsters.js';

// Общий поиск из шапки (GET /search): по названию сразу во всех разделах. Порядок —
// порядок групп в выпадающем списке.
export const SEARCH_KINDS = [
  'ability',
  'monster',
  'character',
  'item',
  'effect',
  'map',
] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export function isSearchKind(value: unknown): value is SearchKind {
  return (SEARCH_KINDS as readonly unknown[]).includes(value);
}

// Лимиты общие для поля и сервера.
export const SEARCH_QUERY_MAX_LENGTH = 100;
export const SEARCH_LIMIT_DEFAULT = 5;
export const SEARCH_LIMIT_MAX = 50;

interface SearchHitBase {
  id: string;
  name: string;
}

// Запись справочника: своя (и скрытая) или чужая опубликованная.
interface CatalogSearchHit extends SearchHitBase {
  mine: boolean;
  authorNickname: string;
}

export interface AbilitySearchHit extends CatalogSearchHit {
  category: AbilityCategory;
  // Круг заклинания; у других категорий null.
  spellLevel: number | null;
}

export interface MonsterSearchHit extends CatalogSearchHit {
  type: MonsterType;
  challenge: MonsterChallenge;
}

export interface ItemSearchHit extends CatalogSearchHit {
  category: ItemCategory;
  cost: ItemCost | null;
}

export interface EffectSearchHit extends CatalogSearchHit {
  components: EffectComponentKind[];
}

// Персонажи и карты — только свои: чужой персонаж по ссылке открыт тому, у кого ссылка,
// а не всем через поиск.
export interface CharacterSearchHit extends SearchHitBase {
  characterKind: CharacterKind;
  classes: CharacterClassLevel[];
}

export interface MapSearchHit extends SearchHitBase {
  width: number;
  depth: number;
}

interface SearchHits {
  ability: AbilitySearchHit;
  monster: MonsterSearchHit;
  character: CharacterSearchHit;
  item: ItemSearchHit;
  effect: EffectSearchHit;
  map: MapSearchHit;
}

// total — сколько нашлось всего, hits — первые из них: сначала названия, которые с запроса
// начинаются, потом по алфавиту.
export type SearchGroup = {
  [K in SearchKind]: { kind: K; total: number; hits: SearchHits[K][] };
}[SearchKind];

// Группы — все запрошенные разделы в порядке SEARCH_KINDS, пустые тоже.
export interface SearchResult {
  groups: SearchGroup[];
}
