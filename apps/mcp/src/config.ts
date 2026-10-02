// Настройки из окружения процесса или из apps/mcp/.env (см. envFile.ts).
export interface McpConfig {
  apiUrl: string;
  webUrl: string;
  // undefined — токен не задан: сервер всё равно стартует, а инструменты объясняют,
  // что делать, — так проблему видно в чате, а не в логах запуска.
  token: string | undefined;
}

const trimSlash = (url: string) => url.replace(/\/+$/, '');

export function readConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  return {
    apiUrl: trimSlash(env.DND_API_URL || 'http://localhost:3000/api'),
    webUrl: trimSlash(env.DND_WEB_URL || 'http://localhost:5173'),
    token: env.DND_API_TOKEN || undefined,
  };
}
