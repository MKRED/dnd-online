import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vitest транспилирует через esbuild, а он не умеет emitDecoratorMetadata —
  // без метаданных типов параметров Nest DI не знает, что инжектить. SWC умеет.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      include: ['src/**/*.ts'],
      reportsDirectory: './coverage',
    },
  },
});
