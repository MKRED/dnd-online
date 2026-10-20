import { describe, expect, it, vi } from 'vitest';
import { createApiCall, DndApiError, type ApiCall } from './apiClient.js';
import { readConfig } from './config.js';
import { call, connect } from './testing/mcpClient.js';

const MAP_ID = '11111111-1111-4111-8111-111111111111';

describe('dnd MCP server', () => {
  it('регистрирует инструменты чтения и карты', async () => {
    const client = await connect(vi.fn());
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'apply_ops',
      'block_guide',
      'create_map',
      'find_catalog',
      'get',
      'list_maps',
      'map_section',
      'map_slice',
      'map_summary',
      'redo',
      'search',
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

  it('create_map передаёт размер карты', async () => {
    const api = vi.fn().mockResolvedValue({ id: MAP_ID, width: 10, depth: 20 });
    const client = await connect(api as unknown as ApiCall);

    await call(client, 'create_map', { name: 'Двор', width: 10, depth: 20 });

    expect(api).toHaveBeenCalledWith('/maps', {
      method: 'POST',
      body: { name: 'Двор', width: 10, depth: 20 },
    });
  });

  it('apply_ops пропускает resize на сервер', async () => {
    const api = vi.fn().mockResolvedValue({ seq: 2, changedCells: 0 });
    const client = await connect(api as unknown as ApiCall);
    const ops = [{ op: 'resize', grow: { down: 3, east: -1 }, cut: 'delete' }];

    const result = await call(client, 'apply_ops', { mapId: MAP_ID, ops });

    expect(result.isError).toBe(false);
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
      .mockRejectedValue(new DndApiError('HTTP 400: Неизвестный блок'));
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
    expect(text).toContain(
      'resize {grow: {north, south, west, east, down}, cut?}',
    );
    expect(text).toContain('ОБЪЕКТЫ НА КАРТЕ');
    expect(text).toContain('placeObject {at, object}');
  });

  it('apply_ops пропускает операции объектов и отдаёт их номера без справочника', async () => {
    const api = vi.fn().mockResolvedValue({
      seq: 3,
      changedCells: 0,
      conflicts: 0,
      paletteAdded: [],
      changes: { cells: [], paletteAdded: [] },
      createdObjectIds: [4],
      refs: { monsters: {}, items: {}, npcs: {} },
    });
    const client = await connect(api as unknown as ApiCall);
    const ops = [
      {
        op: 'placeObject',
        at: [1, 1, 1],
        object: { kind: 'monster', monsterId: MAP_ID, facing: 90 },
      },
      { op: 'turnObject', id: 2, facing: 315 },
      { op: 'updateObject', id: 3, object: { quantity: 2 } },
      { op: 'removeObject', id: 1 },
    ];

    const result = await call(client, 'apply_ops', { mapId: MAP_ID, ops });

    expect(result.isError).toBe(false);
    expect(JSON.parse(result.text)).toEqual({
      seq: 3,
      changedCells: 0,
      conflicts: 0,
      paletteAdded: [],
      createdObjectIds: [4],
    });
    expect(api).toHaveBeenCalledWith(`/maps/${MAP_ID}/ops`, {
      method: 'POST',
      body: { ops },
    });
  });

  it('apply_ops не пропускает неверный взгляд объекта', async () => {
    const api = vi.fn();
    const client = await connect(api as unknown as ApiCall);
    const result = await call(client, 'apply_ops', {
      mapId: MAP_ID,
      ops: [{ op: 'turnObject', id: 1, facing: 30 }],
    });
    expect(result.isError).toBe(true);
    expect(api).not.toHaveBeenCalled();
  });

  it('find_catalog ищет по виду и строке', async () => {
    const api = vi
      .fn()
      .mockResolvedValue([{ id: MAP_ID, name: 'Гоблин', size: 'small' }]);
    const client = await connect(api as unknown as ApiCall);

    const result = await call(client, 'find_catalog', {
      kind: 'monster',
      q: 'гоб',
    });

    expect(JSON.parse(result.text)).toEqual([
      { id: MAP_ID, name: 'Гоблин', size: 'small' },
    ]);
    expect(api).toHaveBeenCalledWith(
      '/map-catalog?kind=monster&q=%D0%B3%D0%BE%D0%B1',
    );
  });
});

describe('createApiCall', () => {
  it('без токена объясняет, где его взять', async () => {
    const api = createApiCall(readConfig({}));
    await expect(api('/maps')).rejects.toThrow('DND_API_TOKEN');
  });
});
