import { describe, expect, it, vi } from 'vitest';
import { DndApiError, type ApiCall } from './apiClient.js';
import { SEARCH_LIMIT, type searchEntities } from './search.js';
import { call, connect } from './testing/mcpClient.js';

const ID = '11111111-1111-4111-8111-111111111111';

const catalogEntry = (
  id: string,
  name: string,
  over: Record<string, unknown> = {},
) => ({
  id,
  name,
  authorNickname: 'я',
  isPublic: false,
  image: null,
  ...over,
});

// Подмена API по адресу: каждый список отвечает своим набором записей.
function fakeApi(routes: Record<string, unknown>) {
  return vi.fn((path: string) => {
    if (!(path in routes)) throw new Error(`Неожиданный запрос ${path}`);
    return Promise.resolve(routes[path]);
  });
}

const emptyCatalogs = {
  '/monsters?scope=mine': [],
  '/monsters?scope=catalog': [],
  '/items?scope=mine': [],
  '/items?scope=catalog': [],
  '/abilities?scope=mine': [],
  '/abilities?scope=catalog': [],
  '/effects?scope=mine': [],
  '/effects?scope=catalog': [],
  '/block-groups?scope=mine': [],
  '/block-groups?scope=catalog': [],
  '/voxel-models?scope=mine': [],
  '/voxel-models?scope=catalog': [],
  '/furniture?scope=mine': [],
  '/furniture?scope=catalog': [],
};

type SearchResult = Awaited<ReturnType<typeof searchEntities>>;

async function search(api: ReturnType<typeof fakeApi>, args = {}) {
  const client = await connect(api as unknown as ApiCall);
  const result = await call(client, 'search', args);
  return { ...result, body: JSON.parse(result.text) as SearchResult };
}

describe('search', () => {
  it('соединяет свои записи с опубликованными чужими без повторов', async () => {
    const api = fakeApi({
      '/items?scope=mine': [
        catalogEntry('a', 'Зелье противоядия', { category: 'plain' }),
        catalogEntry('b', 'Факел', { isPublic: true, image: { version: 1 } }),
      ],
      '/items?scope=catalog': [
        catalogEntry('b', 'Факел', { isPublic: true }),
        catalogEntry('c', 'Верёвка', {
          authorNickname: 'Гость',
          isPublic: true,
        }),
      ],
    });

    const { body } = await search(api, { kind: 'item' });

    expect(body).toEqual({
      total: 3,
      byKind: { item: 3 },
      shown: 3,
      results: [
        {
          kind: 'item',
          id: 'c',
          name: 'Верёвка',
          own: false,
          author: 'Гость',
          visibility: 'public',
          hasImage: false,
        },
        {
          kind: 'item',
          id: 'a',
          name: 'Зелье противоядия',
          category: 'plain',
          own: true,
          visibility: 'hidden',
          hasImage: false,
        },
        {
          kind: 'item',
          id: 'b',
          name: 'Факел',
          own: true,
          visibility: 'public',
          hasImage: true,
        },
      ],
    });
  });

  it('делит персонажей и НПС и ищет без регистра и «ё»', async () => {
    const api = fakeApi({
      ...emptyCatalogs,
      '/characters': [
        {
          id: 'p',
          kind: 'pc',
          name: 'Ёрш',
          linkAccess: 'link',
          mainImage: null,
        },
        {
          id: 'n',
          kind: 'npc',
          name: 'Трактирщик Ерш',
          linkAccess: 'private',
          mainImage: { id: 'i', thumbVersion: 1 },
        },
        {
          id: 'x',
          kind: 'pc',
          name: 'Арагорн',
          linkAccess: 'private',
          mainImage: null,
        },
      ],
      '/monsters?scope=mine': [
        catalogEntry('m', 'Ершистая крыса', { category: 'beast' }),
      ],
    });

    const { body } = await search(api, { q: 'ЕРШ' });

    expect(body.results.map((r) => [r.kind, r.id, r.visibility])).toEqual([
      ['character', 'p', 'link'],
      ['npc', 'n', 'hidden'],
      ['monster', 'm', 'hidden'],
    ]);
  });

  it('находит модели и обстановку', async () => {
    const api = fakeApi({
      ...emptyCatalogs,
      '/characters': [],
      '/voxel-models?scope=mine': [catalogEntry('m', 'Стол')],
      '/furniture?scope=mine': [catalogEntry('f', 'Стол')],
    });

    const { body } = await search(api, { q: 'стол' });

    expect(body.results.map((hit) => [hit.kind, hit.id])).toEqual([
      ['voxel_model', 'm'],
      ['furniture', 'f'],
    ]);
  });

  it('по одному виду не запрашивает остальные', async () => {
    const api = fakeApi({ '/characters': [] });
    await search(api, { kind: 'npc' });
    expect(api).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledWith('/characters');
  });

  it(`обрезает ответ до ${SEARCH_LIMIT} строк и говорит, сколько нашлось`, async () => {
    const many = Array.from({ length: SEARCH_LIMIT + 5 }, (_, i) =>
      catalogEntry(`e${i}`, `Эффект ${String(i).padStart(3, '0')}`),
    );
    const api = fakeApi({
      '/effects?scope=mine': many,
      '/effects?scope=catalog': [],
    });

    const { body } = await search(api, { kind: 'effect' });

    expect(body.total).toBe(SEARCH_LIMIT + 5);
    expect(body.byKind).toEqual({ effect: SEARCH_LIMIT + 5 });
    expect(body.shown).toBe(SEARCH_LIMIT);
    expect(body.results).toHaveLength(SEARCH_LIMIT);
  });

  it('ошибку сервера отдаёт модели с isError', async () => {
    const api = vi
      .fn()
      .mockRejectedValue(new DndApiError('HTTP 401: Unauthorized'));
    const client = await connect(api as unknown as ApiCall);
    const result = await call(client, 'search', { kind: 'monster' });
    expect(result).toEqual({ isError: true, text: 'HTTP 401: Unauthorized' });
  });
});

describe('get', () => {
  it.each([
    ['character', `/characters/${ID}`],
    ['npc', `/characters/${ID}`],
    ['monster', `/monsters/${ID}`],
    ['item', `/items/${ID}`],
    ['ability', `/abilities/${ID}`],
    ['effect', `/effects/${ID}`],
  ])('%s читает запись по своему адресу', async (kind, path) => {
    const api = vi.fn().mockResolvedValue({ id: ID, name: 'Крыса' });
    const client = await connect(api as unknown as ApiCall);

    const result = await call(client, 'get', { kind, id: ID });

    expect(api).toHaveBeenCalledWith(path);
    expect(JSON.parse(result.text)).toEqual({ id: ID, name: 'Крыса' });
  });

  it('не пускает id, который не похож на uuid', async () => {
    const api = vi.fn();
    const client = await connect(api as unknown as ApiCall);
    const result = await call(client, 'get', { kind: 'item', id: '../maps' });
    expect(result.isError).toBe(true);
    expect(api).not.toHaveBeenCalled();
  });
});
