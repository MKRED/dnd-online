import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RELOAD_GUARD_MS,
  canReloadForNewVersion,
  isChunkLoadError,
  page,
  reloadForNewVersion,
  resetChunkReloadForTests,
} from './chunkReload';

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x/assets/A-1.js',
    'error loading dynamically imported module: https://x/assets/A-1.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/A-1.css',
  ])('узнаёт «%s»', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('не путает с другими ошибками', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch'))).toBe(false);
    expect(isChunkLoadError('dynamically imported module')).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('reloadForNewVersion', () => {
  let reload: ReturnType<typeof vi.fn<() => void>>;
  beforeEach(() => {
    window.sessionStorage.clear();
    resetChunkReloadForTests();
    reload = vi.fn<() => void>();
    vi.spyOn(page, 'reload').mockImplementation(reload);
  });
  afterEach(() => resetChunkReloadForTests());

  it('перезагружает один раз и запоминает время', () => {
    reloadForNewVersion(1_000);
    reloadForNewVersion(1_001);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('dnd:chunk-reload-at')).toBe('1000');
    // Перезагрузка уже идёт — экран «Загружаем» остаётся верным.
    expect(canReloadForNewVersion(1_002)).toBe(true);
  });

  it('не перезагружает снова сразу после перезагрузки — нет цикла', () => {
    window.sessionStorage.setItem('dnd:chunk-reload-at', '1000');
    expect(canReloadForNewVersion(1_000 + RELOAD_GUARD_MS)).toBe(false);
    reloadForNewVersion(1_000 + RELOAD_GUARD_MS);
    expect(reload).not.toHaveBeenCalled();
  });

  it('после паузы снова может перезагрузить (следующий деплой)', () => {
    window.sessionStorage.setItem('dnd:chunk-reload-at', '1000');
    reloadForNewVersion(1_001 + RELOAD_GUARD_MS);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('без sessionStorage не перезагружает', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    reloadForNewVersion(1_000);
    expect(reload).not.toHaveBeenCalled();
  });
});
