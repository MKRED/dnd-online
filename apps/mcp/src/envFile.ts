import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// apps/mcp/.env (рядом с package.json; файл в .gitignore) — сюда кладут токен,
// чтобы не заводить системную переменную. Путь от собранного dist/, а не от cwd:
// cwd зависит от того, откуда Claude Code запустил сервер.
const ENV_FILE = resolve(import.meta.dirname, '..', '.env');

// Переменные окружения процесса важнее файла: loadEnvFile их не перезаписывает.
export function loadEnvFile(): void {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
}
