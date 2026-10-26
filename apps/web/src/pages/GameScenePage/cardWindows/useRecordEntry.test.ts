import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRecordEntry } from './useRecordEntry';

const urlOf = (input: string | URL | Request) =>
  typeof input === 'string' ? input : 'url' in input ? input.url : input.href;

// Ответы по части пути; остальное — 404.
function stubFetch(routes: Record<string, { status: number; body: unknown }>) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const url = urlOf(input);
    const hit = Object.entries(routes).find(([path]) => url.includes(path));
    const { status, body } = hit?.[1] ?? {
      status: 404,
      body: { message: 'Нет' },
    };
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const urls = (mock: ReturnType<typeof stubFetch>) =>
  mock.mock.calls.map(([input]) => urlOf(input));

describe('useRecordEntry', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('мастеру — копия из библиотеки игры', async () => {
    const mock = stubFetch({
      '/games/g1/library/ability/a1': {
        status: 200,
        body: { record: { id: 'a1', name: 'Копия' } },
      },
    });
    const { result } = renderHook(() =>
      useRecordEntry('g1', true, 'ability', 'a1'),
    );
    await waitFor(() =>
      expect(result.current.loaded?.record.name).toBe('Копия'),
    );
    expect(urls(mock).some((url) => url.includes('/abilities/'))).toBe(false);
  });

  it('копии нет — мастеру запись из справочника', async () => {
    stubFetch({
      '/abilities/a1': { status: 200, body: { id: 'a1', name: 'Справочник' } },
    });
    const { result } = renderHook(() =>
      useRecordEntry('g1', true, 'ability', 'a1'),
    );
    await waitFor(() =>
      expect(result.current.loaded?.record.name).toBe('Справочник'),
    );
  });

  it('игроку — только справочник, библиотека закрыта', async () => {
    const mock = stubFetch({
      '/items/i1': { status: 200, body: { id: 'i1', name: 'Верёвка' } },
    });
    const { result } = renderHook(() =>
      useRecordEntry('g1', false, 'item', 'i1'),
    );
    await waitFor(() => expect(result.current.loaded?.kind).toBe('item'));
    expect(urls(mock).some((url) => url.includes('/library/'))).toBe(false);
  });

  it('другая ошибка библиотеки — сообщение, а не справочник', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const mock = stubFetch({
      '/games/g1/library/': { status: 500, body: { message: 'Сбой' } },
    });
    const { result } = renderHook(() =>
      useRecordEntry('g1', true, 'effect', 'e1'),
    );
    await waitFor(() => expect(result.current.error).toBe('Сбой'));
    expect(urls(mock).some((url) => url.includes('/effects/'))).toBe(false);
  });
});
