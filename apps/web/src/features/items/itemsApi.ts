import type {
  Item,
  CatalogImage,
  CatalogImageVariant,
  ItemInput,
  CatalogListScope,
  ThumbCrop,
} from 'shared';
import { apiRequest } from '../../lib/apiRequest';

export function listItems(scope: CatalogListScope): Promise<Item[]> {
  return apiRequest(`/items?scope=${scope}`);
}

export function getItem(id: string): Promise<Item> {
  return apiRequest(`/items/${id}`);
}

export function createItem(input: ItemInput): Promise<Item> {
  return apiRequest('/items', { method: 'POST', body: JSON.stringify(input) });
}

export function updateItem(id: string, input: ItemInput): Promise<Item> {
  return apiRequest(`/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteItem(id: string): Promise<void> {
  return apiRequest(`/items/${id}`, { method: 'DELETE' });
}

const imageBase = (itemId: string) => `/items/${itemId}/image`;

// Картинка у предмета одна: загрузка её же и заменяет.
export function uploadItemImage(
  itemId: string,
  file: File,
): Promise<CatalogImage> {
  const body = new FormData();
  body.append('file', file);
  return apiRequest(imageBase(itemId), { method: 'PUT', body });
}

export function recropItemImage(
  itemId: string,
  thumbCrop: ThumbCrop,
): Promise<CatalogImage> {
  return apiRequest(imageBase(itemId), {
    method: 'PATCH',
    body: JSON.stringify({ thumbCrop }),
  });
}

export function deleteItemImage(itemId: string): Promise<void> {
  return apiRequest(imageBase(itemId), { method: 'DELETE' });
}

// Путь байтов картинки для кеша blob-адресов (lib/useImageUrls). Версия растёт при
// замене картинки и смене выреза, а сервер разрешает кешировать ответ навсегда.
export function itemImagePath(
  itemId: string,
  variant: CatalogImageVariant,
  version: number,
): string {
  return `${imageBase(itemId)}?variant=${variant}&v=${version}`;
}
