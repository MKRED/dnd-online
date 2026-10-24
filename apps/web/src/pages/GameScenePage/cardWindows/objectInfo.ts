import {
  LOCK_DC_LABELS,
  type MapObject,
  type MapObjectRefsView,
  type ObjectItem,
} from 'shared';
import type { ObjectImagePaths } from '../../../features/maps/MapScene';

export interface ObjectInfoItem {
  itemId: string;
  name: string;
  quantity: number;
  // Путь миниатюры; null — картинки нет.
  image: string | null;
}

// Что знает мастер об объекте сцены в «Игре» (docs/plan/scene-page.md, этап 6): название,
// замок, содержимое и положения двери.
export interface ObjectInfo {
  title: string;
  subtitle: string;
  // null — у объекта нет содержимого (дверь, стол); [] — пусто.
  items: ObjectInfoItem[] | null;
  // Подпись над списком: «Содержимое» у контейнера, «Предмет» у предмета на полу.
  itemsLabel: string;
  locked: boolean;
  // Положения обстановки (дверь: «Закрыта», «Открыта»); меньше двух — переключать нечего.
  positions: string[];
  position: number;
}

function itemsOf(
  list: readonly ObjectItem[],
  refs: MapObjectRefsView,
  images: ObjectImagePaths,
): ObjectInfoItem[] {
  return list.map(({ itemId, quantity }) => {
    const ref = refs.items[itemId];
    const found = ref?.missing === null ? ref : null;
    return {
      itemId,
      quantity,
      name: found?.name ?? 'Предмет недоступен',
      image: found?.image ? images.item(itemId, found.image.version) : null,
    };
  });
}

export function objectInfo(
  object: MapObject,
  refs: MapObjectRefsView,
  images: ObjectImagePaths,
): ObjectInfo | null {
  const none = {
    items: null,
    itemsLabel: 'Содержимое',
    locked: false,
    positions: [],
    position: 0,
  };
  switch (object.kind) {
    case 'container':
      return {
        ...none,
        title: object.name || 'Контейнер',
        subtitle: 'Контейнер',
        items: itemsOf(object.items, refs, images),
      };
    case 'item': {
      const [item] = itemsOf([object], refs, images);
      return {
        ...none,
        title: item.name,
        subtitle: 'Предмет на полу',
        items: [item],
        itemsLabel: 'Предмет',
      };
    }
    case 'furniture': {
      const ref = refs.furniture[object.furnitureId];
      const found = ref?.missing === null ? ref : null;
      const lockDc = found?.container?.lockDc ?? null;
      const locked = object.locked ?? false;
      const positions = found?.positions.map((p) => p.name) ?? [];
      return {
        ...none,
        title: object.name || found?.name || 'Обстановка',
        subtitle: [
          found?.container ? 'Контейнер' : 'Обстановка',
          locked && (lockDc ? LOCK_DC_LABELS[lockDc] : 'заперт'),
        ]
          .filter(Boolean)
          .join(' · '),
        items: found?.container
          ? itemsOf(object.items ?? [], refs, images)
          : null,
        locked,
        positions,
        position: Math.min(
          object.position ?? 0,
          Math.max(positions.length - 1, 0),
        ),
      };
    }
    default:
      return null;
  }
}
