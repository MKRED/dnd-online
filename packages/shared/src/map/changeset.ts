import { chunkKeysInBox, type Vec3 } from './coords.js';
import { pruneEmptyChunks, readCell, writeCell } from './chunkStore.js';
import { MapOpError } from './mapOpError.js';
import { sameSize, sizeLabel, type MapSize } from './mapSize.js';
import type { MapState } from './mapState.js';
import type { MapObjects } from './objects/mapObject.js';
import {
  applyObjectChanges,
  type ObjectChange,
} from './objects/objectChanges.js';

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
  // Размер карты до и после — только у правок с resize.
  size?: { before: MapSize; after: MapSize };
  // Объекты на карте (docs/plan/map-objects.md) — только у правок, которые их тронули.
  objects?: ObjectChange[];
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
// applied — что реально изменилось, всегда в прямом виде (для undo «до» и «после»
// переставлены): это и пишется в журнал, и рассылается клиентам.
// Размер, в отличие от клеток, конфликтом не пропускается: блоки resize сдвинуты
// под новый размер, а другой размер карты значит, что правки пропущены.
function applySize(
  state: MapState & { size?: MapSize },
  size: NonNullable<Changeset['size']>,
  forward: boolean,
): Changeset['size'] {
  const [expected, target] = forward
    ? [size.before, size.after]
    : [size.after, size.before];
  if (!state.size || !sameSize(state.size, expected)) {
    throw new MapOpError(
      `Размер карты расходится с изменениями (ожидался ${sizeLabel(expected)}) — нужна досинхронизация`,
    );
  }
  state.size = { ...target };
  return { before: expected, after: target };
}

export function applyChangeset(
  state: MapState & { size?: MapSize; objects?: MapObjects },
  changeset: Changeset,
  direction: ChangesetDirection,
): { conflicts: Vec3[]; objectConflicts: number[]; applied: Changeset } {
  const forward = direction === 'forward';
  if (forward) syncPalette(state, changeset.paletteAdded);
  const size = changeset.size && applySize(state, changeset.size, forward);
  const ordered = forward ? changeset.cells : [...changeset.cells].reverse();
  const conflicts: Vec3[] = [];
  const appliedCells: CellChange[] = [];
  const touched = new Set<string>();
  for (const { at, before, after } of ordered) {
    const [expected, target] = forward ? [before, after] : [after, before];
    if (readCell(state.store, at) !== expected) {
      conflicts.push(at);
      continue;
    }
    writeCell(state.store, at, target);
    appliedCells.push({ at, before: expected, after: target });
    for (const key of chunkKeysInBox({ min: at, max: at })) touched.add(key);
  }
  pruneEmptyChunks(state.store, touched);
  const objects = applyObjects(state, changeset.objects, forward);
  return {
    conflicts,
    objectConflicts: objects.conflicts,
    applied: {
      cells: appliedCells,
      paletteAdded: forward ? changeset.paletteAdded : [],
      ...(size && { size }),
      ...(objects.applied.length > 0 && { objects: objects.applied }),
    },
  };
}

function applyObjects(
  state: { objects?: MapObjects },
  changes: ObjectChange[] | undefined,
  forward: boolean,
) {
  if (!changes?.length) return { conflicts: [], applied: [] };
  if (!state.objects) {
    throw new MapOpError(
      'Изменения затрагивают объекты, а объектов карты нет — нужна досинхронизация',
    );
  }
  return applyObjectChanges(state.objects, changes, forward);
}
