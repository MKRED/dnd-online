import {
  exploredCells,
  objectBox,
  objectSeen,
  sameObject,
  type ObjectRefs,
  type FogMasks,
  type MapObject,
  type PackedChangeset,
} from 'shared';

// Сцена глазами игрока (решено с пользователем 2026-10-20 и 2026-10-21): скрытых
// объектов нет вовсе, у контейнеров нет содержимого, а под туманом войны
// (docs/plan/done/fog-of-war.md) — нет и того, чего группа не видит: существ вне поля зрения
// и всего в неоткрытых клетках. Одно правило и для чтения сцены, и для рассылки правок:
// копия игрока — проекция настоящей сцены, и правка, спроецированная тем же правилом,
// ложится на неё без конфликтов. fog — null, когда тумана нет. refs — справочник
// обстановки: под туманом её место берётся из модели (objectSeen).
export function forPlayer(
  object: MapObject | null,
  fog: FogMasks | null = null,
  refs?: ObjectRefs,
): MapObject | null {
  if (!object || object.hidden) return null;
  const box =
    refs && object.kind === 'furniture' ? objectBox(object, refs) : undefined;
  if (!objectSeen(object, fog, box)) return null;
  return object.kind === 'container' ? { ...object, items: [] } : object;
}

// Правка для игрока: клетки — только в открытом, объекты — проекцией. Объект, который
// стал скрытым или ушёл из поля зрения, для игрока убран, «выведенный» или попавший в
// поле зрения — поставлен; правка, которой игрок не видит (скрытый объект сдвинули, в
// сундук положили), выпадает.
export function playerChanges(
  changes: PackedChangeset,
  fog: FogMasks | null = null,
): PackedChangeset {
  const cells = fog
    ? exploredCells(changes.cells, fog.explored)
    : changes.cells;
  const objects = (changes.objects ?? []).flatMap((change) => {
    const before = forPlayer(change.before, fog);
    const after = forPlayer(change.after, fog);
    return sameObject(before, after) ? [] : [{ id: change.id, before, after }];
  });
  return {
    cells,
    paletteAdded: changes.paletteAdded,
    ...(changes.size && { size: changes.size }),
    ...(objects.length > 0 && { objects }),
  };
}
