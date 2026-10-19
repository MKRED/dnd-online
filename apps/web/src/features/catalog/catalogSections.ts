// Разделы справочника (docs/plan/done/abilities-effects.md, «Место в интерфейсе»): у каждого
// свой адрес, ссылка «Справочник» в шапке ведёт на первый.
export const CATALOG_SECTIONS = [
  { value: 'items', path: '/items', label: 'Предметы' },
  { value: 'abilities', path: '/abilities', label: 'Способности' },
  { value: 'effects', path: '/effects', label: 'Эффекты' },
  { value: 'monsters', path: '/monsters', label: 'Монстры' },
] as const;
export type CatalogSection = (typeof CATALOG_SECTIONS)[number]['value'];
