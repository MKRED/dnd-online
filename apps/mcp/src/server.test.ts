import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it, vi } from 'vitest';
import { createApiCall, MapApiError, type ApiCall } from './apiClient.js';
import { readConfig } from './config.js';
import { createMapMcpServer } from './server.js';

const MAP_ID = '11111111-1111-4111-8111-111111111111';

async function connect(api: ApiCall) {
  const server = createMapMcpServer(api, 'http://web.test');
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

async function call(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
) {
  const result = (await client.callTool({
    name,
    arguments: args,
  })) as CallToolResult;
  const first = result.content[0];
  return {
    isError: result.isError ?? false,
    text: first?.type === 'text' ? first.text : '',
  };
}

describe('dnd-map MCP server', () => {
  it('регистрирует инструменты карты', async () => {
    const client = await connect(vi.fn());
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'apply_ops',
      'block_guide',
      'create_map',
      'list_maps',
      'map_section',
      'map_slice',
      'map_summary',
      'redo',
      'undo',
      'view_url',
    ]);
  });

  it('apply_ops отправляет пачку на сервер и не показывает модели клетки', async () => {
    const api = vi.fn().mockResolvedValue({
      seq: 1,
      changedCells: 2,
      changes: { cells: [0, 0, 0, 0, 4, 1, 0, 0, 0, 4], paletteAdded: [] },
    });
    const client = await connect(api as unknown as ApiCall);
    const ops = [
      { op: 'fillBox', from: [0, 0, 0], to: [1, 0, 0], block: 'stone' },
    ];

    const result = await call(client, 'apply_ops', { mapId: MAP_ID, ops });

    expect(result.isError).toBe(false);
    expect(JSON.parse(result.text)).toEqual({ seq: 1, changedCells: 2 });
    expect(api).toHaveBeenCalledWith(`/maps/${MAP_ID}/ops`, {
      method: 'POST',
      body: { ops },
    });
  });

  it('map_section передаёт серверу только заданные параметры', async () => {
    const api = vi
      .fn()
      .mockResolvedValue({ seq: 4, axis: 'x', at: 3, text: 'Разрез x=3' });
    const client = await connect(api as unknown as ApiCall);

    const result = await call(client, 'map_section', {
      mapId: MAP_ID,
      axis: 'x',
      at: 3,
      minY: 0,
      maxY: 8,
    });

    expect(result).toEqual({ isError: false, text: 'seq 4\nРазрез x=3' });
    expect(api).toHaveBeenCalledWith(
      `/maps/${MAP_ID}/section?axis=x&at=3&minY=0&maxY=8`,
    );
  });

  it('ошибку API возвращает модели как результат с isError', async () => {
    const api = vi
      .fn()
      .mockRejectedValue(new MapApiError('HTTP 400: Неизвестный блок'));
    const client = await connect(api as unknown as ApiCall);

    const result = await call(client, 'undo', { mapId: MAP_ID });

    expect(result).toEqual({
      isError: true,
      text: 'HTTP 400: Неизвестный блок',
    });
  });

  it('map_slice передаёт только заданные параметры', async () => {
    const api = vi.fn().mockResolvedValue({ seq: 3, y: 1, text: 'ASCII' });
    const client = await connect(api as unknown as ApiCall);

    const result = await call(client, 'map_slice', { mapId: MAP_ID, y: 1 });

    expect(api).toHaveBeenCalledWith(`/maps/${MAP_ID}/slice?y=1`);
    expect(result.text).toBe('seq 3\nASCII');
  });

  it('view_url строит ссылку с ракурсом и срезом', async () => {
    const client = await connect(vi.fn());
    const result = await call(client, 'view_url', {
      mapId: MAP_ID,
      view: 'north',
      y: 3,
    });
    expect(result.text).toBe(`http://web.test/maps/${MAP_ID}?view=north&y=3`);
  });

  it('block_guide описывает блоки и повороты', async () => {
    const client = await connect(vi.fn());
    const { text } = await call(client, 'block_guide');
    expect(text).toContain('stone_stairs');
    expect(text).toContain('Север — -z');
  });
});

describe('createApiCall', () => {
  it('без токена объясняет, где его взять', async () => {
    const api = createApiCall(readConfig({}));
    await expect(api('/maps')).rejects.toThrow('DND_API_TOKEN');
  });
});
