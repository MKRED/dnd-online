import type { Item, CatalogImage, ItemInput } from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import * as itemsApi from '../itemsApi';
import { sameCrop, scaleCrop, type ImageDraft } from './imageDraft';

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

// Сохранение формы: сначала поля предмета (создание или правка), потом картинка —
// загрузить новую, поправить вырез, убрать. Картинка идёт отдельными запросами, поэтому
// её ошибка не отменяет сохранённый предмет, а возвращается отдельно.
export async function saveItem(
  itemId: string | null,
  input: ItemInput,
  draft: ImageDraft,
  savedImage: CatalogImage | null,
  api: ItemsApi = itemsApi,
): Promise<SaveResult> {
  const item = itemId
    ? await api.updateItem(itemId, input)
    : await api.createItem(input);
  try {
    await saveImage(api, item.id, draft, savedImage);
    return { item, imageError: null };
  } catch (err: unknown) {
    console.error('Failed to save item image', err);
    return {
      item,
      imageError: errorMessage(err, 'Не удалось сохранить картинку'),
    };
  }
}

async function saveImage(
  api: ItemsApi,
  itemId: string,
  draft: ImageDraft,
  savedImage: CatalogImage | null,
): Promise<void> {
  if (draft.kind === 'none') {
    if (savedImage) await api.deleteItemImage(itemId);
    return;
  }
  if (draft.kind === 'saved') {
    if (!sameCrop(draft.crop, draft.image.thumbCrop)) {
      await api.recropItemImage(itemId, draft.crop);
    }
    return;
  }
  const uploaded = await api.uploadItemImage(itemId, draft.file);
  // Вырез не трогали — сервер уже вписал картинку целиком.
  if (!draft.crop) return;
  const crop = scaleCrop(draft.crop, uploaded.width / draft.width);
  if (!sameCrop(crop, uploaded.thumbCrop)) {
    await api.recropItemImage(itemId, crop);
  }
}
