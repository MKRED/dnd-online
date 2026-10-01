import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Отдельный конфиг, а не mergeConfig от vitest.config.ts: mergeConfig склеивает
// массивы, и include подхватил бы ещё и unit-тесты.
// e2e поднимает весь AppModule — нужен доступный DATABASE_URL.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    environment: 'node',
  },
});
