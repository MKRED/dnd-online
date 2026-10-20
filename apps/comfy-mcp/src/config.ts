import { resolve } from 'node:path';
import { PACKAGE_DIR } from './envFile.js';

// Настройки из окружения процесса или из apps/comfy-mcp/.env (см. envFile.ts).
export interface ComfyConfig {
  // undefined — адрес не задан: сервер всё равно стартует, а инструменты объясняют, что
  // делать, — так проблему видно в чате, а не в логах запуска.
  url: string | undefined;
  outputDir: string;
  stylesDir: string;
  timeoutMs: number;
}

const DEFAULT_TIMEOUT_SEC = 300;

export function readConfig(env: NodeJS.ProcessEnv = process.env): ComfyConfig {
  const timeout = Number(env.COMFY_TIMEOUT_SEC);
  return {
    url: env.COMFY_URL ? env.COMFY_URL.replace(/\/+$/, '') : undefined,
    outputDir: env.COMFY_OUTPUT_DIR || resolve(PACKAGE_DIR, 'output'),
    stylesDir: resolve(PACKAGE_DIR, 'styles'),
    timeoutMs:
      (Number.isFinite(timeout) && timeout > 0
        ? timeout
        : DEFAULT_TIMEOUT_SEC) * 1000,
  };
}
