import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './apiRequest';
import { onSessionExpired } from './session';

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status });

// Ответы по пути запроса, по очереди: так порядок параллельных запросов не важен.
function stubFetch(routes: Record<string, Response[]>) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const path = new URL(input as string).pathname.replace(/^\/api/, '');
    const next = routes[path]?.shift();
    if (!next) throw new Error(`Unexpected request ${path}`);
    return Promise.resolve(next);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const calls = (mock: ReturnType<typeof stubFetch>, path: string) =>
  mock.mock.calls.filter(([input]) => (input as string).endsWith(path)).length;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('на 401 обновляет сессию и повторяет запрос', async () => {
    const fetchMock = stubFetch({
      '/maps': [json(401), json(200, ['карта'])],
      '/auth/refresh': [json(200, { ok: true })],
    });

    await expect(apiRequest('/maps')).resolves.toEqual(['карта']);
    expect(calls(fetchMock, '/maps')).toBe(2);
  });

  it('параллельные 401 ждут один общий refresh', async () => {
    const fetchMock = stubFetch({
      '/maps': [json(401), json(200, [])],
      '/characters': [json(401), json(200, [])],
      '/auth/refresh': [json(200, { ok: true })],
    });

    await Promise.all([apiRequest('/maps'), apiRequest('/characters')]);
    expect(calls(fetchMock, '/auth/refresh')).toBe(1);
  });

  it('если refresh отклонён, бросает 401 и сообщает об истёкшей сессии', async () => {
    stubFetch({
      '/maps': [json(401, { message: 'Access token missing' })],
      '/auth/refresh': [json(401)],
    });
    const expired = vi.fn();
    const unsubscribe = onSessionExpired(expired);

    await expect(apiRequest('/maps')).rejects.toEqual(
      new ApiError(401, 'Access token missing'),
    );
    expect(expired).toHaveBeenCalledOnce();
    unsubscribe();
  });
});
