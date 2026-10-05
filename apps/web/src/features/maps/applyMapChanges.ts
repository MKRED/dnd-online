import {
  applyChangeset,
  cellLocation,
  MemoryChunkStore,
  unpackChangeset,
  type MapState,
  type PackedChangeset,
} from 'shared';

// Новое состояние карты с изменениями из ответа сервера. Старое не трогается:
// сцена пересобирает геометрию по смене ссылок, поэтому чанки копируются только
// затронутые (copy-on-write), а нетронутые остаются теми же массивами — по ним
// сцена понимает, что чанк пересобирать не нужно.
// Бросает, если изменения не ложатся на нашу копию (конфликт или чужая палитра):
// значит, копия разошлась с сервером и карту нужно перечитать.
export function applyMapChanges(
  state: MapState,
  packed: PackedChangeset,
): MapState {
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
  const next: MapState = { store, palette: [...state.palette] };
  const { conflicts } = applyChangeset(next, changeset, 'forward');
  if (conflicts.length > 0) {
    throw new Error(`Map copy diverged: ${conflicts.length} conflicting cells`);
  }
  return next;
}
