import type { CatalogImage } from './catalogImage.js';
import type { CharacterMainImage } from './characterImages.js';

// Закладки (docs/plan/bookmarks.md): игрок отмечает персонажей и записи справочника,
// свои и чужие. Порядок — порядок чипов и разделов на странице «Закладки».
export const BOOKMARK_KINDS = [
  'character',
  'item',
  'ability',
  'effect',
] as const;
export type BookmarkKind = (typeof BOOKMARK_KINDS)[number];

export function isBookmarkKind(value: unknown): value is BookmarkKind {
  return (BOOKMARK_KINDS as readonly unknown[]).includes(value);
}

// Что закладка показывает о цели. Миниатюра у персонажа своя (основная картинка
// галереи), у записей справочника — картинка записи.
export interface BookmarkTarget {
  name: string;
  authorId: string;
  authorNickname: string;
}

export type CharacterBookmarkTarget = BookmarkTarget & {
  mainImage: CharacterMainImage | null;
};

export type CatalogBookmarkTarget = BookmarkTarget & {
  image: CatalogImage | null;
};

// target: null — автор закрыл доступ: ни названия, ни картинки смотреть уже нельзя,
// закладку можно только убрать. Удалённая цель уходит из закладок сама.
export type Bookmark = { targetId: string; createdAt: string } & (
  | { kind: 'character'; target: CharacterBookmarkTarget | null }
  | {
      kind: Exclude<BookmarkKind, 'character'>;
      target: CatalogBookmarkTarget | null;
    }
);

export interface BookmarkState {
  bookmarked: boolean;
}
