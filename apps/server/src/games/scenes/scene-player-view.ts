import { sameObject, type MapObject, type PackedChangeset } from 'shared';

// Сцена глазами игрока (решено с пользователем 2026-10-20 и 2026-10-21): скрытых
// объектов нет вовсе, у контейнеров нет содержимого. Одно правило и для чтения сцены,
// и для рассылки правок: копия игрока — проекция настоящей сцены, и правка, спроецированная
// тем же правилом, ложится на неё без конфликтов.
export function forPlayer(object: MapObject | null): MapObject | null {
  if (!object || object.hidden) return null;
  return object.kind === 'container' ? { ...object, items: [] } : object;
}

// Правка для игрока: клетки как есть (блоки не скрываются), объекты — проекцией.
// Объект, который стал скрытым, для игрока убран, «выведенный» — поставлен; правка,
// которой игрок не видит (скрытый объект сдвинули, в сундук положили), выпадает.
export function playerChanges(changes: PackedChangeset): PackedChangeset {
  if (!changes.objects) return changes;
  const objects = changes.objects.flatMap((change) => {
    const before = forPlayer(change.before);
    const after = forPlayer(change.after);
    return sameObject(before, after) ? [] : [{ id: change.id, before, after }];
  });
  return {
    cells: changes.cells,
    paletteAdded: changes.paletteAdded,
    ...(changes.size && { size: changes.size }),
    ...(objects.length > 0 && { objects }),
  };
}
