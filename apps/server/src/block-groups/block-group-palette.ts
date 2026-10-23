import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

// Палитра хранит имена форм группы: id группы для куба и «id_форма» для остальных
// (shared/customBlocks.ts), поэтому ищем по началу имени, а не по точному совпадению.
export const usesGroup = (palette: AnyPgColumn, groupId: string) =>
  sql<boolean>`exists (select 1 from jsonb_array_elements_text(${palette}) as entry(name) where entry.name = ${groupId} or starts_with(entry.name, ${`${groupId}_`}))`;
