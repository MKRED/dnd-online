import { eq } from 'drizzle-orm';
import type { DatabaseService } from '../database/database.service.js';
import { users } from '../database/schema/index.js';

// Ник автора для ответа после записи: returning() отдаёт только строку персонажа.
export async function nicknameOf(
  db: DatabaseService['db'],
  userId: string,
): Promise<string> {
  const [row] = await db
    .select({ nickname: users.nickname })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.nickname ?? '';
}
