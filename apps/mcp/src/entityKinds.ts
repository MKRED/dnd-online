// Виды записей, которые нейросеть ищет и читает (docs/plan/ai-access.md, этап 2).
// Персонаж и НПС — одна таблица на сервере (/characters), их делит только поле kind.
export const ENTITY_KINDS = [
  'character',
  'npc',
  'monster',
  'item',
  'ability',
  'effect',
  'block_group',
] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export const CATALOG_KINDS = [
  'monster',
  'item',
  'ability',
  'effect',
  'block_group',
] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export const isCatalogKind = (kind: EntityKind): kind is CatalogKind =>
  (CATALOG_KINDS as readonly string[]).includes(kind);

const PATHS: Record<EntityKind, string> = {
  character: '/characters',
  npc: '/characters',
  monster: '/monsters',
  item: '/items',
  ability: '/abilities',
  effect: '/effects',
  block_group: '/block-groups',
};

export const entityPath = (kind: EntityKind, id?: string) =>
  id ? `${PATHS[kind]}/${id}` : PATHS[kind];
