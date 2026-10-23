import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
// defineConfig из vitest/config — тот же Vite-конфиг, но знает про секцию test.
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // ndarray собирает функции через Function(...) прямо при загрузке, и CSP прода
      // роняет на этом поток сжатия моделей. Нам он не нужен — подробности в заглушке.
      {
        find: /^ndarray(-pixels|-lanczos)?$/,
        replacement: fileURLToPath(
          new URL(
            './src/features/characters/CharacterModel/compress/ndarrayStub.ts',
            import.meta.url,
          ),
        ),
      },
    ],
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // vi.stubGlobal('fetch', …) в одном тесте не должен протекать в соседние.
    unstubGlobals: true,
    restoreMocks: true,
  },
});
