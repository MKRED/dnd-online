import { apiRequestBlob } from './apiRequest';

// Картинки (персонажей, предметов) приходят через fetch и показываются как object URL:
// тег <img> с адресом API не обновил бы истёкшую сессию (docs/plan/character-images.md).
// Кеш нужен, чтобы одна и та же картинка в списке, просмотрщике и редакторе миниатюры
// грузилась один раз, а её URL освобождался, когда она больше нигде не показана: иначе
// blob остаётся в памяти до закрытия вкладки.
//
// Ключ — путь картинки в API вместе с запросом (variant, версия): он и адрес загрузки,
// и уникален для каждого варианта содержимого.

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

// Берёт URL картинки и считает вызывающего её пользователем до releaseImageUrl.
export function acquireImageUrl(path: string): Promise<string> {
  let entry = entries.get(path);
  if (!entry) {
    const url = apiRequestBlob(path).then((blob) => URL.createObjectURL(blob));
    const created: Entry = { url, users: 0 };
    entry = created;
    entries.set(path, entry);
    url.then(
      (resolved) => {
        created.resolved = resolved;
      },
      // Неудачную загрузку не кешируем: следующий показ попробует ещё раз. Об ошибке
      // сообщает тот, кто ждал URL.
      () => {
        if (entries.get(path) === created) entries.delete(path);
      },
    );
  }
  entry.users += 1;
  return entry.url;
}

// Уже загруженный URL или undefined. Освобождённых URL здесь нет: запись удаляется
// из кеша раньше, чем URL отзывается.
export function peekImageUrl(path: string): string | undefined {
  return entries.get(path)?.resolved;
}

export function releaseImageUrl(path: string): void {
  const entry = entries.get(path);
  if (!entry) return;
  entry.users -= 1;
  if (entry.users > 0) return;
  setTimeout(() => {
    if (entry.users > 0 || entries.get(path) !== entry) return;
    entries.delete(path);
    entry.url.then(
      (url) => URL.revokeObjectURL(url),
      // Загрузка не удалась — освобождать нечего, а об ошибке уже сообщил тот, кто ждал URL.
      () => undefined,
    );
  }, RELEASE_DELAY_MS);
}
