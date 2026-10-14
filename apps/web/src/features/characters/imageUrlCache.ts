import type { CharacterImageVariant } from 'shared';
import { fetchCharacterImageFile } from './characterImagesApi';

// Картинки персонажа приходят через fetch и показываются как object URL (см.
// docs/plan/character-images.md). Кеш нужен, чтобы одна и та же картинка в сетке,
// просмотрщике и редакторе миниатюры грузилась один раз, а её URL освобождался, когда
// она больше нигде не показана: иначе blob остаётся в памяти до закрытия вкладки.

export interface ImageRequest {
  characterId: string;
  imageId: string;
  variant: CharacterImageVariant;
  // Только для thumb: версия выреза.
  version?: number;
}

interface Entry {
  url: Promise<string>;
  // Готовый URL — чтобы компонент мог взять его сразу при рендере, без ожидания промиса.
  resolved?: string;
  users: number;
}

// Сколько держать URL после ухода последнего пользователя. Перемонтирование (StrictMode,
// закрыли и снова открыли просмотрщик) в этот срок обходится без повторной загрузки.
const RELEASE_DELAY_MS = 15_000;

const entries = new Map<string, Entry>();

export function imageRequestKey(request: ImageRequest): string {
  const { characterId, imageId, variant, version } = request;
  return [characterId, imageId, variant, version ?? ''].join('/');
}

// Берёт URL картинки и считает вызывающего её пользователем до releaseImageUrl.
export function acquireImageUrl(request: ImageRequest): Promise<string> {
  const key = imageRequestKey(request);
  let entry = entries.get(key);
  if (!entry) {
    const url = fetchCharacterImageFile(
      request.characterId,
      request.imageId,
      request.variant,
      request.version,
    ).then((blob) => URL.createObjectURL(blob));
    const created: Entry = { url, users: 0 };
    entry = created;
    entries.set(key, entry);
    url.then(
      (resolved) => {
        created.resolved = resolved;
      },
      // Неудачную загрузку не кешируем: следующий показ попробует ещё раз. Об ошибке
      // сообщает тот, кто ждал URL.
      () => {
        if (entries.get(key) === created) entries.delete(key);
      },
    );
  }
  entry.users += 1;
  return entry.url;
}

// Уже загруженный URL или undefined. Освобождённых URL здесь нет: запись удаляется
// из кеша раньше, чем URL отзывается.
export function peekImageUrl(request: ImageRequest): string | undefined {
  return entries.get(imageRequestKey(request))?.resolved;
}

export function releaseImageUrl(request: ImageRequest): void {
  const key = imageRequestKey(request);
  const entry = entries.get(key);
  if (!entry) return;
  entry.users -= 1;
  if (entry.users > 0) return;
  setTimeout(() => {
    if (entry.users > 0 || entries.get(key) !== entry) return;
    entries.delete(key);
    entry.url.then(
      (url) => URL.revokeObjectURL(url),
      // Загрузка не удалась — освобождать нечего, а об ошибке уже сообщил тот, кто ждал URL.
      () => undefined,
    );
  }, RELEASE_DELAY_MS);
}
