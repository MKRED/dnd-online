import type {
  CatalogImage,
  CatalogImageVariant,
  CatalogListScope,
  ThumbCrop,
} from 'shared';
import { apiRequest } from '../../lib/apiRequest';

// Путь байтов картинки записи для кеша blob-адресов (lib/useImageUrls). Версия растёт
// при замене картинки и смене выреза, а сервер разрешает кешировать ответ навсегда.
export type ImagePathFn = (
  id: string,
  variant: CatalogImageVariant,
  version: number,
) => string;

// Запросы одного каталога (предметы, способности, эффекты): у всех одинаковые маршруты
// под своим адресом (docs/plan/abilities-effects.md).
export function catalogApi<Entry, Input>(base: string) {
  const imageBase = (id: string) => `${base}/${id}/image`;
  const imagePath: ImagePathFn = (id, variant, version) =>
    `${imageBase(id)}?variant=${variant}&v=${version}`;

  return {
    list: (scope: CatalogListScope): Promise<Entry[]> =>
      apiRequest(`${base}?scope=${scope}`),
    get: (id: string): Promise<Entry> => apiRequest(`${base}/${id}`),
    create: (input: Input): Promise<Entry> =>
      apiRequest(base, { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: Input): Promise<Entry> =>
      apiRequest(`${base}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    remove: (id: string): Promise<void> =>
      apiRequest(`${base}/${id}`, { method: 'DELETE' }),
    // Картинка у записи одна: загрузка её же и заменяет.
    uploadImage: (id: string, file: File): Promise<CatalogImage> => {
      const body = new FormData();
      body.append('file', file);
      return apiRequest(imageBase(id), { method: 'PUT', body });
    },
    recropImage: (id: string, thumbCrop: ThumbCrop): Promise<CatalogImage> =>
      apiRequest(imageBase(id), {
        method: 'PATCH',
        body: JSON.stringify({ thumbCrop }),
      }),
    deleteImage: (id: string): Promise<void> =>
      apiRequest(imageBase(id), { method: 'DELETE' }),
    imagePath,
  };
}

// Запросы картинки — то, что нужно сохранению формы (saveImage).
export type CatalogImageApi = Pick<
  ReturnType<typeof catalogApi>,
  'uploadImage' | 'recropImage' | 'deleteImage'
>;
