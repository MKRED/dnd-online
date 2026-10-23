import {
  chunkKeysInBox,
  isObjectOp,
  MODEL_SIZE_MAX,
  type MapObjects,
  type MapOp,
  type Vec3,
} from 'shared';

// Чанки, которые нужны строгим пересечениям обстановки (docs/plan/blocks.md, этап 8в):
// клетки модели и соседние — опора снизу, блок за спиной или над верхом. Размер модели
// до правки неизвестен, поэтому берём куб по пределу модели с запасом в клетку. Операциям
// других объектов чанки не нужны.
export function furnitureChunkKeys(
  ops: MapOp[],
  objects: MapObjects,
): string[] {
  const keys = new Set<string>();
  for (const op of ops) {
    if (!isObjectOp(op) || op.op === 'removeObject' || op.force) continue;
    let anchor: Vec3 | undefined;
    if (op.op === 'placeObject') {
      if (op.object.kind === 'furniture') anchor = op.at;
    } else {
      const current = objects.byId.get(op.id);
      if (current?.kind === 'furniture')
        anchor = op.op === 'moveObject' ? op.at : current.at;
    }
    if (!anchor) continue;
    const [x, y, z] = anchor;
    for (const key of chunkKeysInBox({
      min: [x - 1, Math.max(0, y - 1), z - 1],
      max: [x + MODEL_SIZE_MAX, y + MODEL_SIZE_MAX, z + MODEL_SIZE_MAX],
    }))
      keys.add(key);
  }
  return [...keys];
}
