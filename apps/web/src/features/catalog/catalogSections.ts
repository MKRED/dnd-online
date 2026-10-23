// Разделы справочника (docs/plan/done/abilities-effects.md, «Место в интерфейсе»): у каждого
// свой адрес и свой пункт в группе «Справочник» боковой панели (components/AppLayout).
export const CATALOG_SECTIONS = [
  { value: 'items', path: '/items', label: 'Предметы' },
  { value: 'abilities', path: '/abilities', label: 'Способности' },
  { value: 'effects', path: '/effects', label: 'Эффекты' },
  { value: 'monsters', path: '/monsters', label: 'Монстры' },
  { value: 'blocks', path: '/blocks', label: 'Блоки' },
  { value: 'models', path: '/models', label: 'Модели' },
  { value: 'furniture', path: '/furniture', label: 'Обстановка' },
] as const;
export type CatalogSection = (typeof CATALOG_SECTIONS)[number]['value'];
