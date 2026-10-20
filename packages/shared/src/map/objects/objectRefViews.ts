import type { CatalogImage } from '../../catalogImage.js';
import type { CharacterMainImage } from '../../characterImages.js';
import type { MonsterRole } from '../../monsters.js';
import type { CreatureSize } from '../rules/creature.js';
import type { MapObject } from './mapObject.js';
import { emptyObjectRefs, type ObjectRefs } from './objectRefs.js';

// Что клиент знает о ссылках объектов: имя и картинка, или заглушка. Ссылки лежат в
// объектах без внешних ключей, поэтому цель могли скрыть или удалить после постановки
// (docs/plan/map-objects.md, «Ссылки на каталог»).
export type RefMissing = 'hidden' | 'deleted';

// Размер есть всегда: место на карте нужно и заглушке. У удалённого — Средний.
export type MonsterRefView = { size: CreatureSize } & (
  | {
      missing: null;
      name: string;
      role: MonsterRole;
      image: CatalogImage | null;
    }
  | { missing: RefMissing }
);

export type ItemRefView =
  | { missing: null; name: string; image: CatalogImage | null }
  | { missing: RefMissing };

export type NpcRefView =
  | { missing: null; name: string; mainImage: CharacterMainImage | null }
  | { missing: RefMissing };

// Справочник по id: в ответе /chunks — для всех объектов карты, в ответе правки — для
// затронутых ею.
export interface MapObjectRefsView {
  monsters: Record<string, MonsterRefView>;
  items: Record<string, ItemRefView>;
  npcs: Record<string, NpcRefView>;
}

export function emptyRefsView(): MapObjectRefsView {
  return { monsters: {}, items: {}, npcs: {} };
}

// Id, на которые ссылаются объекты: по ним сервер собирает справочник.
export function objectRefIds(objects: Iterable<MapObject>) {
  const ids = {
    monsters: new Set<string>(),
    items: new Set<string>(),
    npcs: new Set<string>(),
  };
  for (const object of objects) {
    if (object.kind === 'monster') ids.monsters.add(object.monsterId);
    if (object.kind === 'npc') ids.npcs.add(object.characterId);
    if (object.kind === 'item') ids.items.add(object.itemId);
    if (object.kind === 'container') {
      for (const { itemId } of object.items) ids.items.add(itemId);
    }
  }
  return ids;
}

// Справочник для правок на клиенте (подсчёт потерь при смене размера): нужны только
// размеры монстров. Ставить что-либо клиент сам не проверяет — это делает сервер.
export function objectRefsFromView(view: MapObjectRefsView): ObjectRefs {
  const refs = emptyObjectRefs();
  for (const [id, monster] of Object.entries(view.monsters)) {
    refs.monsters.set(id, {
      name: monster.missing === null ? monster.name : '',
      size: monster.size,
      role: monster.missing === null ? monster.role : 'regular',
      usable: monster.missing === null,
    });
  }
  return refs;
}

// Справочник после правки: старые записи дополняются и перезаписываются новыми.
export function mergeRefsView(
  base: MapObjectRefsView,
  added: MapObjectRefsView,
): MapObjectRefsView {
  return {
    monsters: { ...base.monsters, ...added.monsters },
    items: { ...base.items, ...added.items },
    npcs: { ...base.npcs, ...added.npcs },
  };
}
