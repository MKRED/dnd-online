import type { CatalogImage, Item, ItemInput } from 'shared';
import { saveWithImage, type ImageDraft } from '../../catalog';
import * as itemsApi from '../itemsApi';

type ItemsApi = Pick<
  typeof itemsApi,
  | 'createItem'
  | 'updateItem'
  | 'uploadItemImage'
  | 'recropItemImage'
  | 'deleteItemImage'
>;

export interface SaveResult {
  item: Item;
  // Предмет сохранён, а картинка — нет. Форма остаётся открытой, чтобы повторить.
  imageError: string | null;
}

// Сохранение формы предмета: поля, потом картинка — общий порядок каталогов
// (saveWithImage).
export async function saveItem(
  itemId: string | null,
  input: ItemInput,
  draft: ImageDraft,
  savedImage: CatalogImage | null,
  api: ItemsApi = itemsApi,
): Promise<SaveResult> {
  const { entry, imageError } = await saveWithImage(
    () => (itemId ? api.updateItem(itemId, input) : api.createItem(input)),
    {
      uploadImage: api.uploadItemImage,
      recropImage: api.recropItemImage,
      deleteImage: api.deleteItemImage,
    },
    draft,
    savedImage,
  );
  return { item: entry, imageError };
}
