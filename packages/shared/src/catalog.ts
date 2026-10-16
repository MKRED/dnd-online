import type { CatalogImage } from './catalogImage.js';

// Общее у каталогов, устроенных как предметы: способностей и эффектов
// (docs/plan/abilities-effects.md). У записи есть автор; скрытую видит только он,
// опубликованную — все в каталоге.

// Какой список запрашиваем: свои записи (и скрытые) или опубликованные всех.
export const CATALOG_LIST_SCOPES = ['mine', 'catalog'] as const;
export type CatalogListScope = (typeof CATALOG_LIST_SCOPES)[number];

// Лимиты общие для формы и сервера.
export const CATALOG_NAME_MAX_LENGTH = 100;
export const CATALOG_DESCRIPTION_MAX_LENGTH = 5000;

// Поля записи, кроме категории и её details: их задаёт каждый каталог своим размеченным
// объединением.
export interface CatalogEntryFields {
  id: string;
  authorId: string;
  authorNickname: string;
  isPublic: boolean;
  name: string;
  // Пока главное поле: в нём записано всё, для чего у категории ещё нет своих полей.
  description: string;
  // Откуда запись взята: текст или ссылка, по строке на источник (catalogSources.ts).
  sources: string[];
  image: CatalogImage | null;
  createdAt: string;
  updatedAt: string;
}

// Тело создания и полного редактирования, кроме категории и details.
export interface CatalogEntryInputFields {
  name: string;
  description: string;
  sources: string[];
  isPublic: boolean;
}
