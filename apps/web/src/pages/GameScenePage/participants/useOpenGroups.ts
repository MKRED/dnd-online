import { useCallback, useState } from 'react';

// Раскрытые группы «Участников» и свёрнутые одинаковые существа — привычка мастера, в
// браузере. По умолчанию всё свёрнуто (замечания после первой партии, 2026-10-26).
// Хранилище может быть недоступно (приватный режим) — тогда всё свёрнуто.
const STORAGE_KEY = 'scene.participantsOpen';
// Ключи одинаковых существ — по записи справочника, копятся от игры к игре: старые
// вытесняются.
const KEEP = 60;

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((key): key is string => typeof key === 'string')
        : [],
    );
  } catch (err: unknown) {
    console.error('Failed to read the open participant groups', err);
    return new Set();
  }
}

function save(keys: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys].slice(-KEEP)));
  } catch (err: unknown) {
    console.error('Failed to remember the open participant groups', err);
  }
}

export function useOpenGroups() {
  const [keys, setKeys] = useState(read);
  const update = useCallback((change: (next: Set<string>) => void) => {
    setKeys((prev) => {
      const next = new Set(prev);
      change(next);
      if (next.size === prev.size && [...next].every((k) => prev.has(k)))
        return prev;
      save(next);
      return next;
    });
  }, []);
  const toggle = useCallback(
    (key: string) =>
      update((next) => {
        if (!next.delete(key)) next.add(key);
      }),
    [update],
  );
  // Раскрыть, ничего не сворачивая: выбранный на сцене должен быть виден в списке.
  const reveal = useCallback(
    (open: readonly string[]) =>
      update((next) => {
        for (const key of open) next.add(key);
      }),
    [update],
  );
  return { isOpen: (key: string) => keys.has(key), toggle, reveal };
}
