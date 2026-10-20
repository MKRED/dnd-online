import {
  applyChangeset,
  cellLocation,
  MemoryChunkStore,
  unpackChangeset,
  type MapObjects,
  type MapSize,
  type MapState,
  type PackedChangeset,
} from 'shared';

// Новое состояние карты с изменениями из ответа сервера. Старое не трогается:
// сцена пересобирает геометрию по смене ссылок, поэтому чанки копируются только
// затронутые (copy-on-write), а нетронутые остаются теми же массивами — по ним
// сцена понимает, что чанк пересобирать не нужно.
// Бросает, если изменения не ложатся на нашу копию (конфликт, чужая палитра или
// другой размер): значит, копия разошлась с сервером и карту нужно перечитать.
// Размер и объекты копируются: resize меняет их в той же правке, что и блоки.
export function applyMapChanges<
  S extends MapState & { size?: MapSize; objects?: MapObjects },
>(state: S, packed: PackedChangeset): S {
  const changeset = unpackChangeset(packed);
  const store = new MemoryChunkStore();
  for (const key of state.store.keys()) store.set(key, state.store.get(key)!);
  const copied = new Set<string>();
  for (const { at } of changeset.cells) {
    const { key } = cellLocation(at);
    const chunk = state.store.get(key);
    if (chunk && !copied.has(key)) {
      store.set(key, chunk.slice());
      copied.add(key);
    }
  }
  const next: S = {
    ...state,
    store,
    palette: [...state.palette],
    ...(state.size && { size: { ...state.size } }),
    ...(state.objects && {
      objects: {
        byId: new Map(state.objects.byId),
        nextId: state.objects.nextId,
      },
    }),
  };
  const { conflicts, objectConflicts } = applyChangeset(
    next,
    changeset,
    'forward',
  );
  if (conflicts.length > 0 || objectConflicts.length > 0) {
    throw new Error(
      `Map copy diverged: ${conflicts.length} cells, ${objectConflicts.length} objects in conflict`,
    );
  }
  return next;
}
