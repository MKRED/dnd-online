import type { CatalogImage } from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import type { CatalogImageApi } from '../catalogApi';
import { sameCrop, scaleCrop, type ImageDraft } from './imageDraft';

export interface SaveWithImageResult<Entry> {
  entry: Entry;
  // Запись сохранена, а картинка — нет. Форма остаётся открытой, чтобы повторить.
  imageError: string | null;
}

// Сохранение формы записи каталога: сначала поля (создание или правка — saveEntry),
// потом картинка — загрузить новую, поправить вырез, убрать. Картинка идёт отдельными
// запросами, поэтому её ошибка не отменяет сохранённую запись, а возвращается отдельно.
export async function saveWithImage<Entry extends { id: string }>(
  saveEntry: () => Promise<Entry>,
  api: CatalogImageApi,
  draft: ImageDraft,
  savedImage: CatalogImage | null,
): Promise<SaveWithImageResult<Entry>> {
  const entry = await saveEntry();
  try {
    await saveImage(api, entry.id, draft, savedImage);
    return { entry, imageError: null };
  } catch (err: unknown) {
    console.error('Failed to save catalog image', err);
    return {
      entry,
      imageError: errorMessage(err, 'Не удалось сохранить картинку'),
    };
  }
}

async function saveImage(
  api: CatalogImageApi,
  id: string,
  draft: ImageDraft,
  savedImage: CatalogImage | null,
): Promise<void> {
  if (draft.kind === 'none') {
    if (savedImage) await api.deleteImage(id);
    return;
  }
  if (draft.kind === 'saved') {
    if (!sameCrop(draft.crop, draft.image.thumbCrop)) {
      await api.recropImage(id, draft.crop);
    }
    return;
  }
  const uploaded = await api.uploadImage(id, draft.file);
  // Вырез не трогали — сервер уже вписал картинку целиком.
  if (!draft.crop) return;
  const crop = scaleCrop(draft.crop, uploaded.width / draft.width);
  if (!sameCrop(crop, uploaded.thumbCrop)) {
    await api.recropImage(id, crop);
  }
}
