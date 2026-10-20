import { describe, expect, it } from 'vitest';
import { applyChangeset } from '../changeset.js';
import { packChangeset, unpackChangeset } from '../changesetPacking.js';
import { MemoryChunkStore } from '../chunkStore.js';
import { editMap, type EditableMap } from '../mapEdit.js';
import type { MapOp } from '../ops.js';
import { createPalette } from '../palette.js';
import { resizeLoss } from '../resizeLoss.js';
import { createMapObjects, objectFacing, type MapObject } from './mapObject.js';
import type { ObjectRefs } from './objectRefs.js';

const limits = { maxSize: 64, maxHeight: 16 };
const GOBLIN = '00000000-0000-4000-8000-000000000001';
const DRAGON = '00000000-0000-4000-8000-000000000002';
const HIDDEN = '00000000-0000-4000-8000-000000000003';
const NPC = '00000000-0000-4000-8000-000000000004';
const ROPE = '00000000-0000-4000-8000-000000000005';
const TORCH = '00000000-0000-4000-8000-000000000006';

function refs(): ObjectRefs {
  return {
    monsters: new Map([
      [
        GOBLIN,
        { name: 'Гоблин', size: 'small', role: 'regular', usable: true },
      ],
      [DRAGON, { name: 'Дракон', size: 'huge', role: 'unique', usable: true }],
      [
        HIDDEN,
        { name: 'Тайна', size: 'large', role: 'regular', usable: false },
      ],
    ]),
    // Вес в фунтах: верёвка 10, факел 1.
    items: new Map([
      [ROPE, 10],
      [TORCH, 1],
    ]),
    npcs: new Set([NPC]),
  };
}

function emptyMap(): EditableMap & {
  objects: NonNullable<EditableMap['objects']>;
} {
  return {
    store: new MemoryChunkStore(),
    palette: createPalette(),
    size: { width: 8, depth: 8 },
    objects: createMapObjects(),
  };
}

const edit = (map: EditableMap, ops: MapOp[], maxObjects?: number) =>
  editMap(map, ops, limits, { refs: refs(), maxObjects });

const place = (at: [number, number, number], object: object) =>
  ({ op: 'placeObject', at, object }) as MapOp;

const listed = (map: ReturnType<typeof emptyMap>) => [
  ...map.objects.byId.values(),
];

describe('объекты в editMap', () => {
  it('ставит объекты с номерами по порядку и не переиспользует номер убранного', () => {
    const map = emptyMap();
    const changes = edit(map, [
      place([0, 0, 0], { kind: 'start', facing: 0 }),
      place([2, 0, 2], { kind: 'monster', monsterId: GOBLIN, facing: 90 }),
    ]);
    expect(changes.objects?.map((c) => [c.id, c.before])).toEqual([
      [1, null],
      [2, null],
    ]);
    expect(changes.cells).toEqual([]);
    edit(map, [{ op: 'removeObject', id: 2 }]);
    edit(map, [place([1, 0, 1], { kind: 'start', facing: 0 })]);
    expect(listed(map).map((o) => o.id)).toEqual([1, 3]);
  });

  it('переносит, поворачивает и правит объект', () => {
    const map = emptyMap();
    edit(map, [
      place([0, 0, 0], {
        kind: 'container',
        name: 'Сундук',
        look: 'chest',
        items: [],
      }),
      place([1, 0, 0], {
        kind: 'npc',
        characterId: NPC,
        size: 'medium',
        facing: 0,
      }),
    ]);
    edit(map, [
      { op: 'moveObject', id: 1, at: [3, 1, 3] },
      { op: 'turnObject', id: 2, facing: 135 },
      {
        op: 'updateObject',
        id: 1,
        object: { name: 'Бочка', items: [{ itemId: ROPE, quantity: 2 }] },
      },
    ]);
    expect(map.objects.byId.get(1)).toMatchObject({
      at: [3, 1, 3],
      name: 'Бочка',
      look: 'chest',
      items: [{ itemId: ROPE, quantity: 2 }],
    });
    expect(map.objects.byId.get(2)).toMatchObject({ facing: 135 });
    // Контейнер поворачивают, предмет на полу — нет.
    edit(map, [
      { op: 'turnObject', id: 1, facing: 90 },
      place([5, 0, 5], { kind: 'item', itemId: TORCH }),
    ]);
    expect(map.objects.byId.get(1)).toMatchObject({ facing: 90 });
    expect(() => edit(map, [{ op: 'turnObject', id: 3, facing: 90 }])).toThrow(
      'У объекта 3 нет направления взгляда',
    );
    expect(() =>
      edit(map, [{ op: 'updateObject', id: 2, object: { quantity: 3 } }]),
    ).toThrow('У объекта 2 («npc») нет поля «quantity»');
    expect(() => edit(map, [{ op: 'removeObject', id: 9 }])).toThrow(
      'Операция №1: Объекта 9 нет на карте',
    );
  });

  it('«скрыт от игроков»: ставится сразу или правкой у объекта любого вида', () => {
    const map = emptyMap();
    edit(map, [
      place([0, 0, 0], { kind: 'start', facing: 0 }),
      place([2, 0, 2], {
        kind: 'monster',
        monsterId: GOBLIN,
        facing: 0,
        hidden: true,
      }),
    ]);
    expect(map.objects.byId.get(1)?.hidden).toBe(false);
    expect(map.objects.byId.get(2)?.hidden).toBe(true);
    const changes = edit(map, [
      { op: 'updateObject', id: 1, object: { hidden: true } },
      { op: 'updateObject', id: 2, object: { hidden: false } },
    ]);
    expect(map.objects.byId.get(1)?.hidden).toBe(true);
    expect(map.objects.byId.get(2)?.hidden).toBe(false);
    // Отмена возвращает признак, как любое поле.
    applyChangeset(map, changes, 'backward');
    expect(map.objects.byId.get(1)?.hidden).toBe(false);
    expect(map.objects.byId.get(2)?.hidden).toBe(true);
  });

  it('груз контейнера не больше вместимости вида; правку не хуже пропускает', () => {
    const map = emptyMap();
    const sack = (items: object[]) =>
      place([0, 0, 0], {
        kind: 'container',
        name: 'Мешок',
        look: 'sack',
        items,
      });
    // Мешок — 30 фнт.: три верёвки влезают, четвёртая — нет.
    expect(() => edit(map, [sack([{ itemId: ROPE, quantity: 4 }])])).toThrow(
      'Не влезет в «Мешок»: 40 из 30 фнт.',
    );
    edit(map, [sack([{ itemId: ROPE, quantity: 3 }])]);
    expect(() =>
      edit(map, [
        {
          op: 'updateObject',
          id: 1,
          object: {
            items: [
              { itemId: ROPE, quantity: 3 },
              { itemId: TORCH, quantity: 1 },
            ],
          },
        },
      ]),
    ).toThrow('31 из 30 фнт.');
    // Бочка вмещает 120: сменить вид на больший можно, обратно — нет.
    edit(map, [
      {
        op: 'updateObject',
        id: 1,
        object: { look: 'barrel', items: [{ itemId: ROPE, quantity: 5 }] },
      },
    ]);
    expect(() =>
      edit(map, [{ op: 'updateObject', id: 1, object: { look: 'sack' } }]),
    ).toThrow('Не влезет');

    // Контейнер стал тяжелее вместимости без правки (вес поменяли в каталоге):
    // переименовать и разгрузить можно, догрузить — нет.
    const heavy = { ...refs(), items: new Map([[ROPE, 50]]) };
    const editHeavy = (ops: MapOp[]) =>
      editMap(map, ops, limits, { refs: heavy });
    editHeavy([
      { op: 'updateObject', id: 1, object: { name: 'Старая бочка' } },
    ]);
    editHeavy([
      {
        op: 'updateObject',
        id: 1,
        object: { items: [{ itemId: ROPE, quantity: 4 }] },
      },
    ]);
    expect(() =>
      editHeavy([
        {
          op: 'updateObject',
          id: 1,
          object: { items: [{ itemId: ROPE, quantity: 5 }] },
        },
      ]),
    ).toThrow('250 из 120 фнт.');
  });

  it('контейнер без взгляда (поставлен до поворота) смотрит на север и поворачивается', () => {
    const map = emptyMap();
    const old: MapObject = {
      id: 1,
      at: [0, 0, 0],
      hidden: false,
      kind: 'container',
      name: 'Сундук',
      look: 'chest',
      items: [],
    };
    map.objects = createMapObjects([old], 2);
    expect(objectFacing(old)).toBe(0);
    edit(map, [{ op: 'turnObject', id: 1, facing: 45 }]);
    expect(map.objects.byId.get(1)).toMatchObject({ facing: 45 });
  });

  it('место существа целиком внутри карты', () => {
    const map = emptyMap();
    // Огромный дракон занимает 3 × 3 клетки: от [5, 0, 5] — до [7, 0, 7], впритык.
    edit(map, [
      place([5, 0, 5], { kind: 'monster', monsterId: DRAGON, facing: 0 }),
    ]);
    expect(() =>
      edit(map, [{ op: 'moveObject', id: 1, at: [6, 0, 0] }]),
    ).toThrow('Область [6, 0, 0] – [8, 0, 2] за границей карты 8 × 8');
    expect(() =>
      edit(map, [
        place([7, 0, 7], {
          kind: 'npc',
          characterId: NPC,
          size: 'large',
          facing: 0,
        }),
      ]),
    ).toThrow('за границей карты');
  });

  it('проверяет ссылки: скрытый монстр, чужой НПС, неизвестный предмет', () => {
    const map = emptyMap();
    expect(() =>
      edit(map, [
        place([0, 0, 0], { kind: 'monster', monsterId: HIDDEN, facing: 0 }),
      ]),
    ).toThrow(`Монстр ${HIDDEN} не найден в каталоге`);
    expect(() =>
      edit(map, [
        place([0, 0, 0], {
          kind: 'npc',
          characterId: GOBLIN,
          size: 'medium',
          facing: 0,
        }),
      ]),
    ).toThrow('не найден среди ваших персонажей');
    expect(() =>
      edit(map, [
        place([0, 0, 0], { kind: 'item', itemId: GOBLIN, quantity: 1 }),
      ]),
    ).toThrow(`Предмет ${GOBLIN} не найден в каталоге`);
  });

  it('то, что уже стоит на карте, повторно не проверяется', () => {
    const map = emptyMap();
    const lost: MapObject = {
      id: 1,
      at: [0, 0, 0],
      hidden: false,
      kind: 'container',
      name: 'Сундук',
      look: 'chest',
      // Этот предмет удалили из каталога после постановки.
      items: [{ itemId: GOBLIN, quantity: 1 }],
    };
    map.objects = createMapObjects([lost], 2);
    edit(map, [
      {
        op: 'updateObject',
        id: 1,
        object: {
          items: [
            { itemId: GOBLIN, quantity: 3 },
            { itemId: TORCH, quantity: 1 },
          ],
        },
      },
      { op: 'moveObject', id: 1, at: [4, 0, 4] },
    ]);
    expect(map.objects.byId.get(1)).toMatchObject({ at: [4, 0, 4] });
  });

  it('уникальный монстр на карте только один — и при постановке, и при правке', () => {
    const map = emptyMap();
    edit(map, [
      place([0, 0, 0], { kind: 'monster', monsterId: DRAGON, facing: 0 }),
      place([5, 0, 5], { kind: 'monster', monsterId: GOBLIN, facing: 0 }),
    ]);
    expect(() =>
      edit(map, [
        place([4, 0, 0], { kind: 'monster', monsterId: DRAGON, facing: 0 }),
      ]),
    ).toThrow('Уникальный монстр «Дракон» уже стоит на карте (объект 1)');
    expect(() =>
      edit(map, [{ op: 'updateObject', id: 2, object: { monsterId: DRAGON } }]),
    ).toThrow('уже стоит на карте (объект 1)');
    // Сам дракон правится свободно: он не «второй».
    edit(map, [{ op: 'updateObject', id: 1, object: { facing: 45 } }]);
  });

  it('предел числа объектов', () => {
    const map = emptyMap();
    const start = place([0, 0, 0], { kind: 'start', facing: 0 });
    edit(map, [start, start], 2);
    expect(() => edit(map, [start], 2)).toThrow(
      'На карте уже 2 объектов — это предел',
    );
  });

  it('без загруженных объектов операции объектов отклоняются', () => {
    const map: EditableMap = { ...emptyMap(), objects: undefined };
    expect(() => edit(map, [place([0, 0, 0], { kind: 'start' })])).toThrow(
      'Объекты на этой карте пока недоступны',
    );
  });
});

describe('объекты в журнале', () => {
  it('поставленный и убранный в одной пачке объект в changeset не попадает', () => {
    const map = emptyMap();
    const changes = edit(map, [
      place([0, 0, 0], { kind: 'start', facing: 0 }),
      { op: 'moveObject', id: 1, at: [1, 0, 1] },
      { op: 'removeObject', id: 1 },
      { op: 'setBlock', at: [0, 0, 0], block: 'stone' },
    ]);
    expect(changes.objects).toBeUndefined();
    expect(map.objects.nextId).toBe(2);
  });

  it('отмена и повтор через упакованный changeset', () => {
    const map = emptyMap();
    edit(map, [place([0, 0, 0], { kind: 'start', facing: 0 })]);
    const changes = edit(map, [
      { op: 'moveObject', id: 1, at: [2, 0, 2] },
      place([5, 0, 5], { kind: 'item', itemId: ROPE, quantity: 1 }),
    ]);
    const stored = unpackChangeset(
      JSON.parse(JSON.stringify(packChangeset(changes))),
    );
    const undo = applyChangeset(map, stored, 'backward');
    expect(undo.objectConflicts).toEqual([]);
    expect(listed(map)).toMatchObject([{ id: 1, at: [0, 0, 0] }]);
    applyChangeset(map, stored, 'forward');
    expect(listed(map)).toMatchObject([
      { id: 1, at: [2, 0, 2] },
      { id: 2, kind: 'item' },
    ]);
  });

  it('объект, изменённый после правки, отмена не трогает и считает конфликтом', () => {
    const map = emptyMap();
    const placed = edit(map, [
      place([0, 0, 0], { kind: 'start', facing: 0 }),
      place([1, 0, 0], { kind: 'start', facing: 0 }),
    ]);
    edit(map, [{ op: 'turnObject', id: 2, facing: 180 }]);
    const { objectConflicts, applied } = applyChangeset(
      map,
      placed,
      'backward',
    );
    expect(objectConflicts).toEqual([2]);
    expect(applied.objects?.map((c) => c.id)).toEqual([1]);
    expect(listed(map).map((o) => o.id)).toEqual([2]);
  });

  it('повтор на клиенте сдвигает счётчик номеров', () => {
    const server = emptyMap();
    const changes = edit(server, [
      place([0, 0, 0], { kind: 'start', facing: 0 }),
    ]);
    const client = emptyMap();
    applyChangeset(client, changes, 'forward');
    expect(client.objects.nextId).toBe(2);
  });

  it('changeset с объектами не применить к карте без объектов', () => {
    const changes = edit(emptyMap(), [place([0, 0, 0], { kind: 'start' })]);
    const bare = { ...emptyMap(), objects: undefined };
    expect(() => applyChangeset(bare, changes, 'forward')).toThrow(
      'нужна досинхронизация',
    );
  });
});

describe('объекты и resize', () => {
  function furnished() {
    const map = emptyMap();
    edit(map, [
      place([0, 0, 0], { kind: 'start', facing: 0 }),
      place([7, 0, 3], {
        kind: 'container',
        name: 'Ящик',
        look: 'crate',
        items: [],
      }),
      // Дракон 3 × 3 от [4, 0, 5] до [6, 0, 7].
      place([4, 0, 5], { kind: 'monster', monsterId: DRAGON, facing: 0 }),
    ]);
    return map;
  }

  it('рост на запад, север и вниз сдвигает объекты, отмена возвращает', () => {
    const map = furnished();
    const changes = edit(map, [
      { op: 'resize', grow: { west: 2, north: 1, down: 3 } },
    ]);
    expect(listed(map).map((o) => o.at)).toEqual([
      [2, 3, 1],
      [9, 3, 4],
      [6, 3, 6],
    ]);
    applyChangeset(map, changes, 'backward');
    expect(listed(map).map((o) => o.at)).toEqual([
      [0, 0, 0],
      [7, 0, 3],
      [4, 0, 5],
    ]);
  });

  it('срезанное с запада удаляется, за восточной границей — остаётся или удаляется по cut', () => {
    const keep = furnished();
    edit(keep, [{ op: 'resize', grow: { west: -1, east: -1 } }]);
    // Старт срезан; ящик [6, 0, 3] и дракон до x = 5 — за границей 6 × 8 только ящик.
    expect(listed(keep).map((o) => [o.id, o.at])).toEqual([
      [2, [6, 0, 3]],
      [3, [3, 0, 5]],
    ]);
    expect(keep.objects.byId.get(2)?.hidden).toBe(false);

    const del = furnished();
    edit(del, [{ op: 'resize', grow: { east: -2 }, cut: 'delete' }]);
    // Ящик за границей, а дракон 3 × 3 дотягивался до x = 6 — тоже за ней.
    expect(listed(del).map((o) => o.id)).toEqual([1]);
  });

  it('resizeLoss считает объекты по тому же правилу', () => {
    const map = furnished();
    expect(
      resizeLoss(map, { grow: { west: -1, east: -1 } }, refs()),
    ).toMatchObject({ objectsCut: 1, objectsOutside: 1 });
    expect(resizeLoss(map, { grow: { south: -1 } }, refs())).toMatchObject({
      objectsCut: 0,
      objectsOutside: 1,
    });
  });

  it('объект не поднять выше предела высоты', () => {
    const map = emptyMap();
    edit(map, [place([0, 15, 0], { kind: 'start', facing: 0 })]);
    expect(() => edit(map, [{ op: 'resize', grow: { down: 1 } }])).toThrow(
      'Объект 1 поднимется выше предела высоты: 16 уровней',
    );
  });
});
