// Тонкий клиент HTTP API ComfyUI (docs/plan/ai-access.md, «Сервер comfy»): очередь
// /prompt, результат /history/{id}, файл /view, списки моделей /models/{папка}.
// Websocket не нужен: опроса истории хватает.

// Ошибка, которую стоит показать модели как есть.
export class ComfyError extends Error {}

export type Fetch = typeof fetch;

// Один запрос, не вся генерация: её ждут опросом истории. К выключенному компьютеру в
// Radmin соединение может висеть долго — лучше быстро сказать, что ComfyUI недоступен.
const REQUEST_TIMEOUT_MS = 30_000;

// fetch прячет настоящую причину (ECONNREFUSED, тайм-аут) в cause.
function reason(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  if (err.name === 'TimeoutError') return 'нет ответа за 30 с';
  return err.cause instanceof Error ? err.cause.message : err.message;
}

// Ответ /history/{id}: пустой объект, пока задача не закончилась.
export interface ComfyHistoryEntry {
  outputs: Record<
    string,
    { images?: { filename: string; subfolder: string; type: string }[] }
  >;
  status?: {
    status_str?: string;
    completed?: boolean;
    messages?: [string, Record<string, unknown>][];
  };
}

export interface ComfyClient {
  url: string;
  json<T>(path: string, body?: unknown): Promise<T>;
  bytes(path: string): Promise<Buffer>;
}

export function createComfyClient(
  url: string | undefined,
  fetchFn: Fetch = fetch,
): ComfyClient {
  if (!url) {
    throw new ComfyError(
      'Не задан COMFY_URL. Пропишите адрес ComfyUI (IP компьютера в Radmin VPN и порт, обычно 8188) в apps/comfy-mcp/.env (образец — apps/comfy-mcp/.env.example), затем перезапустите Claude Code.',
    );
  }
  async function request(path: string, body?: unknown) {
    let res: Response;
    try {
      res = await fetchFn(`${url}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers:
          body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      console.error('ComfyUI request failed', path, err);
      throw new ComfyError(
        `ComfyUI недоступен по адресу ${url}: ${reason(err)}. Включён ли компьютер с видеокартой, подключён ли Radmin VPN и запущен ли ComfyUI с --listen?`,
      );
    }
    if (!res.ok) {
      throw new ComfyError(
        `ComfyUI ответил HTTP ${res.status} на ${path}: ${errorText(await res.text())}`,
      );
    }
    return res;
  }
  return {
    url,
    async json<T>(path: string, body?: unknown) {
      return (await (await request(path, body)).json()) as T;
    },
    async bytes(path: string) {
      return Buffer.from(await (await request(path)).arrayBuffer());
    },
  };
}

// Ошибка /prompt приходит JSON-ом: {error: {message, details}, node_errors: {узел:
// {errors: [{message, details}]}}}. Модели нужен текст, а не весь граф.
function errorText(body: string): string {
  try {
    const data = JSON.parse(body) as {
      error?: { message?: string; details?: string };
      node_errors?: Record<
        string,
        {
          class_type?: string;
          errors?: { message?: string; details?: string }[];
        }
      >;
    };
    const nodes = Object.values(data.node_errors ?? {}).flatMap((node) =>
      (node.errors ?? []).map((e) =>
        `${node.class_type ?? 'узел'}: ${e.message ?? ''} ${e.details ?? ''}`.trim(),
      ),
    );
    const head = [data.error?.message, data.error?.details]
      .filter(Boolean)
      .join(' — ');
    return [head, ...nodes].filter(Boolean).join('; ') || body.slice(0, 500);
  } catch {
    // Не JSON — отдаём начало ответа как есть.
    return body.slice(0, 500);
  }
}
