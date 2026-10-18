import { and, eq, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { BookmarkKind } from 'shared';
import { ABILITY_ACCESS } from '../abilities/abilities.config.js';
import { visibleEntry } from '../catalog/catalog-access.js';
import { characterVisibleTo } from '../characters/character-visibility.js';
import { bookmarks, characters } from '../database/schema/index.js';
import { EFFECT_ACCESS } from '../effects/effects.config.js';
import { ITEM_ACCESS } from '../items/item-access.js';

// Для каждого вида закладки: колонка ссылки в bookmarks и проверка «цель видна этому
// игроку» — та же, что у страницы самой цели.
interface BookmarkTargetDef {
  field: 'characterId' | 'itemId' | 'abilityId' | 'effectId';
  column: PgColumn;
  table: PgTable;
  id: PgColumn;
  visible: (userId: string, id: string) => SQL | undefined;
}

export const BOOKMARK_TARGETS: Record<BookmarkKind, BookmarkTargetDef> = {
  character: {
    field: 'characterId',
    column: bookmarks.characterId,
    table: characters,
    id: characters.id,
    visible: (userId: string, id: string) =>
      and(eq(characters.id, id), characterVisibleTo(userId)),
  },
  item: {
    field: 'itemId',
    column: bookmarks.itemId,
    table: ITEM_ACCESS.table,
    id: ITEM_ACCESS.id,
    visible: (userId: string, id: string) =>
      visibleEntry(ITEM_ACCESS, userId, id),
  },
  ability: {
    field: 'abilityId',
    column: bookmarks.abilityId,
    table: ABILITY_ACCESS.table,
    id: ABILITY_ACCESS.id,
    visible: (userId: string, id: string) =>
      visibleEntry(ABILITY_ACCESS, userId, id),
  },
  effect: {
    field: 'effectId',
    column: bookmarks.effectId,
    table: EFFECT_ACCESS.table,
    id: EFFECT_ACCESS.id,
    visible: (userId: string, id: string) =>
      visibleEntry(EFFECT_ACCESS, userId, id),
  },
};
