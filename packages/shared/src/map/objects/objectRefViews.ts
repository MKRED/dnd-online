import type { CatalogImage } from '../../catalogImage.js';
import type { CharacterMainImage } from '../../characterImages.js';
import type { FigureModel } from '../../characterModels.js';
import type { MonsterRole } from '../../monsters.js';
import type { FurnitureMount } from '../../voxelModel/furniture.js';
import type { LockDc } from '../../voxelModel/furnitureContainer.js';
import type { VoxelModelFields } from '../../voxelModel/voxelModel.js';
import type { Vec3 } from '../coords.js';
import type { CreatureSize } from '../rules/creature.js';
import type { MapObject } from './mapObject.js';
import { emptyObjectRefs, type ObjectRefs } from './objectRefs.js';

// Что клиент знает о ссылках объектов: имя и картинка, или заглушка. Ссылки лежат в
// объектах без внешних ключей, поэтому цель могли скрыть или удалить после постановки
// (docs/plan/done/map-objects.md, «Ссылки на каталог»).
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

// weight — фунты, для груза контейнера.
export type ItemRefView =
  | { missing: null; name: string; image: CatalogImage | null; weight: number }
  | { missing: RefMissing };

// model — 3D-модель НПС (docs/plan/done/character-models.md, этап 4): с ней на карте стоит
// она, а не карточка.
export type NpcRefView =
  | {
      missing: null;
      name: string;
      mainImage: CharacterMainImage | null;
      model: FigureModel | null;
    }
  | { missing: RefMissing };

// Обстановка (docs/plan/blocks.md, этап 8в) — с моделью целиком: её рисуют на карте.
// Скрытой не бывает: на карту ставится только своя, а игроку на сцене она нужна вся,
// как блоки мастера. model null — модель удалили, обстановка без вида.
// Модель с id: по нему берут байты загруженного файла (этап 9).
export type FurnitureViewModel = VoxelModelFields & { id: string };

// positions — положения двери с их моделями (этап 8г), пусто — без положений.
export type FurnitureRefView =
  | {
      missing: null;
      name: string;
      mount: FurnitureMount;
      model: FurnitureViewModel | null;
      positions: { name: string; model: FurnitureViewModel | null }[];
      // Вместимость и Сл взлома контейнера (этап 11); null — обычная обстановка.
      container: { capacity: number; lockDc: LockDc | null } | null;
    }
  | { missing: 'deleted' };

// Модель обстановки в текущем положении объекта: положения могли убрать из записи после
// постановки — тогда модель первого.
export function furnitureViewModel(
  view: FurnitureRefView | undefined,
  position: number | undefined,
): FurnitureViewModel | null {
  if (view?.missing !== null) return null;
  return (view.positions[position ?? 0] ?? view).model;
}

const lookOf = (model: VoxelModelFields | null) => ({
  size: model?.size ?? ([1, 1, 1] as Vec3),
  cells: model?.cells ?? {},
  voxels: model?.voxels ?? null,
});

// Справочник по id: в ответе /chunks — для всех объектов карты, в ответе правки — для
// затронутых ею.
export interface MapObjectRefsView {
  monsters: Record<string, MonsterRefView>;
  items: Record<string, ItemRefView>;
  npcs: Record<string, NpcRefView>;
  furniture: Record<string, FurnitureRefView>;
}

export function emptyRefsView(): MapObjectRefsView {
  return { monsters: {}, items: {}, npcs: {}, furniture: {} };
}

// Id, на которые ссылаются объекты: по ним сервер собирает справочник.
export function objectRefIds(objects: Iterable<MapObject>) {
  const ids = {
    monsters: new Set<string>(),
    items: new Set<string>(),
    npcs: new Set<string>(),
    furniture: new Set<string>(),
  };
  for (const object of objects) {
    if (object.kind === 'furniture') ids.furniture.add(object.furnitureId);
    if (object.kind === 'monster') ids.monsters.add(object.monsterId);
    if (object.kind === 'npc') ids.npcs.add(object.characterId);
    if (object.kind === 'item') ids.items.add(object.itemId);
    if (object.kind === 'container' || object.kind === 'furniture') {
      for (const { itemId } of object.items ?? []) ids.items.add(itemId);
    }
  }
  return ids;
}

// Вес предмета для груза контейнера: скрытый и удалённый не считаются
// (containerLoad.ts).
export function itemWeight(view: MapObjectRefsView, itemId: string): number {
  const item = view.items[itemId];
  return item?.missing === null ? item.weight : 0;
}

// Справочник для правок на клиенте: размеры монстров (подсчёт потерь при смене
// размера) и вес видимых предметов. Ставить что-либо клиент сам не проверяет — это
// делает сервер.
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
  for (const id of Object.keys(view.items)) {
    if (view.items[id].missing === null)
      refs.items.set(id, itemWeight(view, id));
  }
  for (const [id, furniture] of Object.entries(view.furniture ?? {})) {
    if (furniture.missing !== null) continue;
    refs.furniture.set(id, {
      name: furniture.name,
      mount: furniture.mount,
      ...lookOf(furniture.model),
      positions: furniture.positions.map((position) => ({
        name: position.name,
        ...lookOf(position.model),
      })),
      container: furniture.container,
      usable: true,
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
    furniture: { ...base.furniture, ...added.furniture },
  };
}
