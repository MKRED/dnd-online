import type { Item, CatalogImage, ItemInput } from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/apiRequest';
import type { ImageDraft } from '../../catalog';
import { saveItem } from './saveItem';

const input: ItemInput = {
  name: 'Меч',
  category: 'basic',
  details: {},
  rarity: 'none',
  weight: 3,
  cost: null,
  description: '',
  isPublic: false,
};
const item = { id: 'i1', image: null } as Item;
const savedImage: CatalogImage = {
  version: 1,
  width: 1000,
  height: 250,
  thumbCrop: { x: 0, y: -375, size: 1000 },
};

function fakeApi() {
  return {
    createItem: vi.fn(() => Promise.resolve(item)),
    updateItem: vi.fn(() => Promise.resolve(item)),
    uploadItemImage: vi.fn(() => Promise.resolve(savedImage)),
    recropItemImage: vi.fn(() => Promise.resolve(savedImage)),
    deleteItemImage: vi.fn(() => Promise.resolve()),
  };
}

const newFile = (
  crop: Extract<ImageDraft, { kind: 'new' }>['crop'],
): ImageDraft => ({
  kind: 'new',
  file: new File(['x'], 'sword.png'),
  url: 'blob:sword',
  width: 4000,
  height: 1000,
  crop,
});

describe('saveItem', () => {
  it('создаёт предмет и загружает картинку без лишней правки выреза', async () => {
    const api = fakeApi();
    const result = await saveItem(null, input, newFile(null), null, api);
    expect(result).toEqual({ item, imageError: null });
    expect(api.createItem).toHaveBeenCalledWith(input);
    expect(api.uploadItemImage).toHaveBeenCalledTimes(1);
    expect(api.recropItemImage).not.toHaveBeenCalled();
  });

  it('пересчитывает свой вырез из пикселей файла в пиксели сохранённой картинки', async () => {
    const api = fakeApi();
    // Файл 4000 px, сервер сохранил 1000 px — масштаб 1/4.
    await saveItem(
      null,
      input,
      newFile({ x: 400, y: -200, size: 2000 }),
      null,
      api,
    );
    expect(api.recropItemImage).toHaveBeenCalledWith('i1', {
      x: 100,
      y: -50,
      size: 500,
    });
  });

  it('при правке убирает картинку и меняет только изменённый вырез', async () => {
    const api = fakeApi();
    await saveItem('i1', input, { kind: 'none' }, savedImage, api);
    expect(api.updateItem).toHaveBeenCalledWith('i1', input);
    expect(api.deleteItemImage).toHaveBeenCalledWith('i1');

    const untouched = fakeApi();
    await saveItem(
      'i1',
      input,
      { kind: 'saved', image: savedImage, crop: savedImage.thumbCrop },
      savedImage,
      untouched,
    );
    expect(untouched.recropItemImage).not.toHaveBeenCalled();
  });

  it('возвращает ошибку картинки отдельно: предмет уже сохранён', async () => {
    const api = fakeApi();
    api.uploadItemImage.mockRejectedValueOnce(
      new ApiError(400, 'Не удалось прочитать картинку'),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await saveItem(null, input, newFile(null), null, api);
    expect(result).toEqual({
      item,
      imageError: 'Не удалось прочитать картинку',
    });
  });
});
