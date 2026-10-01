import { chunkKeysInBox, type Vec3 } from './coords.js';
import { pruneEmptyChunks, readCell, writeCell } from './chunkStore.js';
import type { MapState } from './mapState.js';
import { MapOpError } from './ops.js';

export interface CellChange {
  at: Vec3;
  before: number;
  after: number;
}

export interface PaletteAddition {
  id: number;
  name: string;
}

// Результат операции. По нему журнал делает undo, а сокет рассылает изменения,
// не заставляя клиентов повторять операцию у себя.
export interface Changeset {
  cells: CellChange[];
  // Типы, дописанные в палитру этой операцией, с их id: получатель проверяет, что его
  // палитра совпадает, а не полагается на порядок. Undo их не убирает — палитра только растёт.
  paletteAdded: PaletteAddition[];
}

export type ChangesetDirection = 'forward' | 'backward';

// Дописывает в палитру получателя типы из changeset. Расхождение значит, что получатель
// пропустил операции — нужна досинхронизация, а не молчаливая порча клеток.
function syncPalette(state: MapState, added: PaletteAddition[]) {
  for (const { id, name } of added) {
    if (state.palette[id] === name) continue;
    if (state.palette.length !== id) {
      throw new MapOpError(
        `Палитра карты расходится с изменениями (id ${id} = ${name}) — нужна досинхронизация`,
      );
    }
    state.palette.push(name);
  }
}

// forward — повторить изменения (redo, применение на клиенте), backward — откатить (undo).
// Карту правят несколько участников (мастер, нейросеть, способности), поэтому клетка
// могла измениться после этой операции. Такие клетки не перезаписываются, а
// возвращаются как конфликты — чужие правки не затираются.
export function applyChangeset(
  state: MapState,
  changeset: Changeset,
  direction: ChangesetDirection,
): { conflicts: Vec3[] } {
  if (direction === 'forward') syncPalette(state, changeset.paletteAdded);
  const ordered =
    direction === 'forward' ? changeset.cells : [...changeset.cells].reverse();
  const conflicts: Vec3[] = [];
  const touched = new Set<string>();
  for (const { at, before, after } of ordered) {
    const [expected, target] =
      direction === 'forward' ? [before, after] : [after, before];
    if (readCell(state.store, at) !== expected) {
      conflicts.push(at);
      continue;
    }
    writeCell(state.store, at, target);
    for (const key of chunkKeysInBox({ min: at, max: at })) touched.add(key);
  }
  pruneEmptyChunks(state.store, touched);
  return { conflicts };
}
