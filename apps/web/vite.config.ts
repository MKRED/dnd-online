import react from '@vitejs/plugin-react';
// defineConfig из vitest/config — тот же Vite-конфиг, но знает про секцию test.
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // vi.stubGlobal('fetch', …) в одном тесте не должен протекать в соседние.
    unstubGlobals: true,
    restoreMocks: true,
  },
});
