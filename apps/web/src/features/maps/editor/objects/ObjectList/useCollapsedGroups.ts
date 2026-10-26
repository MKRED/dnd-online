import { useState } from 'react';
import type { ObjectGroupKey } from './objectGroups';

// Свёрнутые группы «На карте» — привычка одного человека, общая для редактора карт и
// сцены игры: в браузере. Хранилище может быть недоступно (приватный режим) — тогда всё
// развёрнуто.
const STORAGE_KEY = 'maps.objectGroupsCollapsed';

function read(): Set<ObjectGroupKey> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((key): key is ObjectGroupKey => typeof key === 'string')
        : [],
    );
  } catch (err: unknown) {
    console.error('Failed to read the collapsed object groups', err);
    return new Set();
  }
}

function save(keys: Set<ObjectGroupKey>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch (err: unknown) {
    console.error('Failed to remember the collapsed object groups', err);
  }
}

export function useCollapsedGroups() {
  const [keys, setKeys] = useState(read);
  const update = (next: Set<ObjectGroupKey>) => {
    setKeys(next);
    save(next);
  };
  return {
    has: (key: ObjectGroupKey) => keys.has(key),
    toggle: (key: ObjectGroupKey) => {
      const next = new Set(keys);
      if (!next.delete(key)) next.add(key);
      update(next);
    },
    setAll: (all: ObjectGroupKey[]) => update(new Set(all)),
  };
}
