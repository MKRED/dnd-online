import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ApiCall, ApiInit } from './apiClient.js';
import { thumbCropFor } from './imageFile.js';
import { call, connect } from './testing/mcpClient.js';

const ID = '11111111-1111-4111-8111-111111111111';
const IMAGE_ID = '22222222-2222-4222-8222-222222222222';
// Подписи форматов: проверка смотрит только на первые байты.
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);

let dir: string;
let png: string;
let text: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dnd-mcp-'));
  png = join(dir, 'rat.png');
  text = join(dir, 'secret.png');
  await writeFile(png, PNG);
  await writeFile(text, 'DND_API_TOKEN=…');
});

afterAll(() => rm(dir, { recursive: true, force: true }));

async function upload(api: ReturnType<typeof vi.fn>, args: object) {
  const client = await connect(api as unknown as ApiCall);
  return call(client, 'upload_image', { id: ID, path: png, ...args });
}

const formFile = (init: ApiInit) => init.form?.get('file') as Blob;

describe('upload_image', () => {
  it('кладёт картинку записи каталога PUT-ом с типом по содержимому', async () => {
    const api = vi
      .fn()
      .mockResolvedValue({ version: 1, width: 64, height: 64 });
    const result = await upload(api, { kind: 'monster' });

    expect(result.isError).toBe(false);
    const [path, init] = api.mock.calls[0] as [string, ApiInit];
    expect(path).toBe(`/monsters/${ID}/image`);
    expect(init.method).toBe('PUT');
    expect(formFile(init).type).toBe('image/png');
    expect(formFile(init).size).toBe(PNG.length);
  });

  it('миниатюру записи каталога ставит отдельной правкой по размеру с сервера', async () => {
    const api = vi
      .fn()
      .mockResolvedValueOnce({ width: 2048, height: 1024 })
      .mockResolvedValueOnce({});
    await upload(api, {
      kind: 'item',
      thumb: { centerX: 0.5, centerY: 0.5, size: 1 },
    });
    expect(api).toHaveBeenLastCalledWith(`/items/${ID}/image`, {
      method: 'PATCH',
      body: { thumbCrop: { x: 512, y: 0, size: 1024 } },
    });
  });

  it('персонажу добавляет в галерею и делает главной по main', async () => {
    const api = vi
      .fn()
      .mockResolvedValueOnce({
        id: IMAGE_ID,
        isMain: false,
        width: 100,
        height: 200,
      })
      .mockResolvedValueOnce({});
    await upload(api, { kind: 'npc', main: true });
    expect(api.mock.calls[0]?.[0]).toBe(`/characters/${ID}/images`);
    expect(api).toHaveBeenLastCalledWith(
      `/characters/${ID}/images/${IMAGE_ID}`,
      { method: 'PATCH', body: { isMain: true } },
    );
  });

  it('первая картинка персонажа уже главная — лишней правки нет', async () => {
    const api = vi.fn().mockResolvedValue({
      id: IMAGE_ID,
      isMain: true,
      width: 100,
      height: 100,
    });
    await upload(api, { kind: 'character', main: true });
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('не отправляет файл, который не картинка', async () => {
    const api = vi.fn();
    const result = await upload(api, { kind: 'item', path: text });
    expect(result).toEqual({
      isError: true,
      text: `Файл ${text} — не PNG, JPEG или WebP.`,
    });
    expect(api).not.toHaveBeenCalled();
  });

  it('объясняет, если файла нет или путь не абсолютный', async () => {
    const api = vi.fn();
    const missing = await upload(api, {
      kind: 'item',
      path: join(dir, 'нет.png'),
    });
    expect(missing.text).toContain('не найден');
    const relative = await upload(api, { kind: 'item', path: 'rat.png' });
    expect(relative.text).toContain('абсолютный путь');
    expect(api).not.toHaveBeenCalled();
  });

  it('main у записи каталога — ошибка', async () => {
    const api = vi.fn();
    const result = await upload(api, { kind: 'effect', main: true });
    expect(result.isError).toBe(true);
    expect(api).not.toHaveBeenCalled();
  });
});

describe('thumbCropFor', () => {
  it('сдвигает квадрат внутрь картинки', () => {
    expect(
      thumbCropFor({ centerX: 0.95, centerY: 0.05, size: 0.5 }, 1000, 800),
    ).toEqual({ x: 600, y: 0, size: 400 });
  });
});
