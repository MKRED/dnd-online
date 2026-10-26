import { sql } from 'drizzle-orm';

// Что ищем: q — непустая часть названия, limit — сколько записей группы отдать.
export interface SearchParams {
  userId: string;
  q: string;
  limit: number;
}

// Строки группы, и в каждой — сколько нашлось всего (до limit).
export type Found<T> = (T & { total: number })[];

// Окно считается до LIMIT, поэтому в каждой строке — число всех найденных: одна выборка
// вместо отдельного count.
export function totalCount() {
  return sql<number>`count(*) over()`.mapWith(Number);
}
