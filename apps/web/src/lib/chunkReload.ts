// Ошибка загрузки куска сайта (ленивого модуля или его CSS). Так бывает, когда вкладка
// открыта до деплоя: её index помнит старые имена файлов с хешами, а новый образ их уже
// не содержит. Тексты у браузеров разные: Chrome, Firefox, Safari и прелоад CSS от Vite.
const CHUNK_ERROR =
  /dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

export function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_ERROR.test(error.message);
}

// Когда страница последний раз перезагружалась сама. Хранится в sessionStorage, то есть
// на вкладку: если и после перезагрузки файл не грузится (нет сети, сайт ещё
// перезапускается), второй раз не перезагружаем, иначе вкладка ушла бы в бесконечный цикл.
const RELOADED_AT_KEY = 'dnd:chunk-reload-at';
export const RELOAD_GUARD_MS = 10_000;

let reloadStarted = false;

// Перезагрузка через объект, чтобы тесты могли её подменить: в jsdom location.reload
// не реализован и не переопределяется.
export const page = {
  reload: () => window.location.reload(),
};

function lastReloadAt(): number | null {
  const raw = window.sessionStorage.getItem(RELOADED_AT_KEY);
  const at = raw === null ? NaN : Number(raw);
  return Number.isFinite(at) ? at : null;
}

/** Можно ли сейчас перезагрузить страницу сама (или перезагрузка уже идёт). */
export function canReloadForNewVersion(now = Date.now()): boolean {
  if (reloadStarted) return true;
  try {
    const at = lastReloadAt();
    return at === null || now - at > RELOAD_GUARD_MS;
  } catch (err) {
    // Без хранилища не узнать, перезагружались ли уже, — лучше показать экран с кнопкой.
    console.error('Chunk reload guard: sessionStorage is unavailable', err);
    return false;
  }
}

/** Перезагружает страницу один раз за RELOAD_GUARD_MS; повторные вызовы ничего не делают. */
export function reloadForNewVersion(now = Date.now()): void {
  if (reloadStarted || !canReloadForNewVersion(now)) return;
  try {
    window.sessionStorage.setItem(RELOADED_AT_KEY, String(now));
  } catch (err) {
    console.error('Chunk reload guard: failed to save the reload time', err);
    return;
  }
  reloadStarted = true;
  page.reload();
}

/** Только для тестов: сбросить флаг «перезагрузка уже идёт». */
export function resetChunkReloadForTests(): void {
  reloadStarted = false;
}
