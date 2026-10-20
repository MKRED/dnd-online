import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// apps/comfy-mcp/.env (рядом с package.json; файл в .gitignore) — здесь адрес ComfyUI.
// Путь от собранного dist/, а не от cwd: cwd зависит от того, откуда Claude Code запустил
// сервер.
export const PACKAGE_DIR = resolve(import.meta.dirname, '..');
const ENV_FILE = resolve(PACKAGE_DIR, '.env');

// Переменные окружения процесса важнее файла: loadEnvFile их не перезаписывает.
export function loadEnvFile(): void {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
}
