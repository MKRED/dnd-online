import { asc, desc, ilike, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

// % и _ в запросе — обычные символы, а не шаблон LIKE.
function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Название содержит запрос без учёта регистра; пустой запрос — без условия.
export function nameContains(
  column: PgColumn,
  q: string | undefined,
): SQL | undefined {
  if (!q) return undefined;
  return ilike(column, `%${escapeLike(q)}%`);
}

// Порядок найденного: сначала названия, которые с запроса начинаются («Огниво» раньше
// «Охвачен огнём»), потом по алфавиту; id — чтобы порядок равных не прыгал.
export function byNameMatch(column: PgColumn, id: PgColumn, q: string) {
  return [
    desc(sql`${column} ilike ${`${escapeLike(q)}%`}`),
    asc(column),
    asc(id),
  ];
}
