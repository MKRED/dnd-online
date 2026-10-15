import { testDatabaseUrl } from './test-database.js';

// В каждом воркере до импорта AppModule: приложение берёт базу из DATABASE_URL, а
// переменные окружения процесса у ConfigModule важнее, чем .env.
process.env.DATABASE_URL = testDatabaseUrl();
// Логи запросов в тестах только мешают читать вывод; LOG_LEVEL=debug вернёт их.
process.env.LOG_LEVEL ??= 'silent';
