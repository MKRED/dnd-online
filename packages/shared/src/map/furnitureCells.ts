import type { BlockOp } from './ops.js';
import { MapOpError } from './mapOpError.js';
import type { MapObjects } from './objects/mapObject.js';
import { objectBox, type ObjectRefs } from './objects/objectRefs.js';
import type { Vec3 } from './coords.js';

// Клетки обстановки для кисти и заливки (docs/plan/blocks.md, «Пересечения»): блок в них не
// ставится. Заливка области обходит их, как replace обходит чужие блоки, — иначе один стол
// в комнате не дал бы залить пол. Одиночный блок в клетку обстановки — отказ: молча не
// поставить его значило бы оставить мастера без ответа. Стереть (воздух) можно везде.
export function furnitureKeep(
  objects: MapObjects | undefined,
  refs: ObjectRefs,
  op: BlockOp,
): ((cell: Vec3) => boolean) | undefined {
  if (!objects || op.block === 'air') return undefined;
  const taken = new Map<string, string>();
  for (const object of objects.byId.values()) {
    if (object.kind !== 'furniture') continue;
    const name = refs.furniture.get(object.furnitureId)?.name ?? 'обстановка';
    const { min, max } = objectBox(object, refs);
    for (let y = min[1]; y <= max[1]; y++)
      for (let z = min[2]; z <= max[2]; z++)
        for (let x = min[0]; x <= max[0]; x++)
          taken.set(`${x},${y},${z}`, name);
  }
  if (taken.size === 0) return undefined;
  if (op.op === 'setBlock') {
    const name = taken.get(op.at.join(','));
    if (name !== undefined)
      throw new MapOpError(
        `В клетке [${op.at.join(', ')}] стоит обстановка «${name}» — сначала уберите её`,
      );
  }
  return (cell) => taken.has(cell.join(','));
}
