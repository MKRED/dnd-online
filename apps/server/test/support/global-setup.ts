import { join } from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { testDatabaseUrl } from './test-database.js';

// Один раз перед прогоном: тестовая база догоняет схему текущего кода теми же
// миграциями, что и прод.
export default async function globalSetup(): Promise<void> {
  const pool = new Pool({ connectionString: testDatabaseUrl() });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: join(import.meta.dirname, '..', '..', 'drizzle'),
    });
  } finally {
    await pool.end();
  }
}
