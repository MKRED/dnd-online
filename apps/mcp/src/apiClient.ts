import type { McpConfig } from './config.js';

// Ошибка, которую стоит показать модели как есть: сообщение сервера (на русском)
// или понятное описание проблемы с подключением.
export class DndApiError extends Error {}

export type ApiCall = <T>(
  path: string,
  init?: { method?: string; body?: unknown },
) => Promise<T>;

export function createApiCall(config: McpConfig): ApiCall {
  return async <T>(
    path: string,
    init: { method?: string; body?: unknown } = {},
  ) => {
    if (!config.token) {
      throw new DndApiError(
        'Не задан DND_API_TOKEN. Создайте токен в профиле, в карточке «Токены для нейросети» (/profile), и пропишите его в apps/mcp/.env (образец — apps/mcp/.env.example), затем перезапустите Claude Code.',
      );
    }
    let res: Response;
    try {
      res = await fetch(`${config.apiUrl}${path}`, {
        method: init.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${config.token}`,
          ...(init.body === undefined
            ? {}
            : { 'Content-Type': 'application/json' }),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
    } catch (err) {
      console.error('DnD API request failed', path, err);
      throw new DndApiError(
        `Сервер ${config.apiUrl} недоступен: ${String(err)}`,
      );
    }
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      // Не JSON — скорее всего, DND_API_URL указывает не на API (например, на SPA).
      throw new DndApiError(
        `Ответ ${config.apiUrl}${path} — не JSON (HTTP ${res.status}). Проверьте DND_API_URL.`,
      );
    }
    if (!res.ok) {
      const message = (data as { message?: string | string[] } | undefined)
        ?.message;
      throw new DndApiError(
        `HTTP ${res.status}: ${Array.isArray(message) ? message.join(', ') : (message ?? res.statusText)}`,
      );
    }
    return data as T;
  };
}
