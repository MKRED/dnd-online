import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Отдельный конфиг, а не mergeConfig от vitest.config.ts: mergeConfig склеивает
// массивы, и include подхватил бы ещё и unit-тесты.
// e2e поднимает весь AppModule на тестовой базе из TEST_DATABASE_URL
// (docs/plan/done/testing.md).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    environment: 'node',
    globalSetup: ['test/support/global-setup.ts'],
    setupFiles: ['test/support/setup-env.ts'],
    // База одна на все файлы, и каждый файл её очищает — по очереди, не параллельно.
    fileParallelism: false,
    // Локально база за туннелем, запросы медленнее, чем в CI.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
