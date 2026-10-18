import { eq, or } from 'drizzle-orm';
import { characters } from '../database/schema/index.js';

// Кто видит персонажа: автор — всегда, остальные — если открыт доступ по ссылке. Закрытый
// чужой персонаж неотличим от несуществующего. Общее для листа и закладок.
export function characterVisibleTo(userId: string) {
  return or(eq(characters.userId, userId), eq(characters.linkAccess, 'link'));
}
