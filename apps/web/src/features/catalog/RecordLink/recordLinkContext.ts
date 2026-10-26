import { createContext } from 'react';

// Записи справочника, на которые ведут строки листа и карточек.
export type RecordKind = 'ability' | 'effect' | 'item';

export const RECORD_PATHS: Record<RecordKind, string> = {
  ability: '/abilities',
  effect: '/effects',
  item: '/items',
};

// Открыть запись на месте, а не уйти на её страницу; name — подпись окна до загрузки.
export type OpenRecord = (kind: RecordKind, id: string, name: string) => void;

// Есть — ссылки на способности, эффекты и предметы открывают окно (сцена игры, замечания
// после первой партии, 2026-10-26); нет — ведут на страницу записи, как везде.
export const RecordLinkContext = createContext<OpenRecord | null>(null);
