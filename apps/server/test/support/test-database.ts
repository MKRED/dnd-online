import 'dotenv/config';

// Тесты очищают таблицы, поэтому база берётся только из TEST_DATABASE_URL (не из
// DATABASE_URL: в .env он смотрит на прод) и только если её имя оканчивается на _test.
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'Нет TEST_DATABASE_URL: интеграционным тестам нужна отдельная база (docs/plan/done/testing.md)',
    );
  }
  assertTestDatabaseName(new URL(url).pathname.slice(1));
  return url;
}

export function assertTestDatabaseName(name: string): void {
  if (!name.endsWith('_test')) {
    throw new Error(
      `База «${name}» не тестовая: имя должно оканчиваться на _test, иначе тесты сотрут данные`,
    );
  }
}
