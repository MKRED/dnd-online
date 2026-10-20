import { describe, expect, it } from 'vitest';
import { MapOpError, parseMapOp } from '../ops.js';
import { parseMapOpBatch } from '../opsBatch.js';

const limits = {
  maxSize: 64,
  maxHeight: 16,
  maxOpVolume: 1000,
  maxOpsPerBatch: 10,
  maxBatchVolume: 1000,
};
const MONSTER = '11111111-2222-4333-8444-555555555555';
const ITEM = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

const parse = (input: unknown) => parseMapOp(input, limits);

describe('разбор операций объектов', () => {
  it('ставит объекты всех видов со значениями по умолчанию', () => {
    expect(
      parse({ op: 'placeObject', at: [1, 0, 2], object: { kind: 'start' } }),
    ).toEqual({
      op: 'placeObject',
      at: [1, 0, 2],
      object: { kind: 'start', facing: 0 },
    });
    expect(
      parse({
        op: 'placeObject',
        at: [0, 0, 0],
        object: { kind: 'npc', characterId: MONSTER },
      }),
    ).toMatchObject({
      object: { kind: 'npc', size: 'medium', facing: 0 },
    });
    expect(
      parse({
        op: 'placeObject',
        at: [0, 0, 0],
        object: { kind: 'container' },
      }),
    ).toMatchObject({
      object: { kind: 'container', name: 'Сундук', look: 'chest', items: [] },
    });
    expect(
      parse({
        op: 'placeObject',
        at: [0, 0, 0],
        object: { kind: 'container', look: 'barrel' },
      }),
    ).toMatchObject({ object: { name: 'Бочка', look: 'barrel' } });
    expect(
      parse({
        op: 'placeObject',
        at: [0, 0, 0],
        object: { kind: 'item', itemId: ITEM.toUpperCase() },
      }),
    ).toMatchObject({ object: { kind: 'item', itemId: ITEM, quantity: 1 } });
  });

  it('отклоняет неизвестный вид, чужое поле и пропущенную ссылку', () => {
    expect(() =>
      parse({ op: 'placeObject', at: [0, 0, 0], object: { kind: 'door' } }),
    ).toThrow('Неизвестный вид объекта: door');
    expect(() =>
      parse({
        op: 'placeObject',
        at: [0, 0, 0],
        object: { kind: 'container', facing: 90 },
      }),
    ).toThrow('У объекта «container» нет поля «facing»');
    expect(() =>
      parse({ op: 'placeObject', at: [0, 0, 0], object: { kind: 'monster' } }),
    ).toThrow('Нужно поле «monsterId»');
    expect(() =>
      parse({
        op: 'placeObject',
        at: [0, 0, 0],
        object: { kind: 'monster', monsterId: 'goblin' },
      }),
    ).toThrow('«monsterId» должен быть id из каталога (uuid)');
  });

  it('проверяет взгляд, размер, количество и содержимое контейнера', () => {
    const place = (object: object) =>
      parse({ op: 'placeObject', at: [0, 0, 0], object });
    expect(() => place({ kind: 'start', facing: 30 })).toThrow('«facing»');
    expect(() =>
      place({ kind: 'npc', characterId: MONSTER, size: 'big' }),
    ).toThrow('«size»');
    expect(() => place({ kind: 'item', itemId: ITEM, quantity: 0 })).toThrow(
      '«quantity» — целое число от 1 до 9999',
    );
    expect(() => place({ kind: 'container', name: '   ' })).toThrow('«name»');
    expect(() =>
      place({
        kind: 'container',
        items: [{ itemId: ITEM }, { itemId: ITEM, quantity: 2 }],
      }),
    ).toThrow(`Предмет ${ITEM} в контейнере дважды`);
  });

  it('правка не меняет вид, поворот требует направления', () => {
    expect(
      parse({ op: 'updateObject', id: 3, object: { quantity: 5 } }),
    ).toEqual({ op: 'updateObject', id: 3, object: { quantity: 5 } });
    expect(() =>
      parse({ op: 'updateObject', id: 3, object: { kind: 'item' } }),
    ).toThrow('Вид объекта не меняется');
    expect(() =>
      parse({ op: 'updateObject', id: 3, object: { color: 'red' } }),
    ).toThrow('Неизвестное поле объекта «color»');
    expect(() => parse({ op: 'turnObject', id: 3 })).toThrow(
      'Нужно поле «facing»',
    );
    expect(parse({ op: 'turnObject', id: 3, facing: 225 })).toEqual({
      op: 'turnObject',
      id: 3,
      facing: 225,
    });
  });

  it('номер объекта — целое от 1, клетка — в общих пределах', () => {
    expect(() => parse({ op: 'removeObject', id: 0 })).toThrow(MapOpError);
    expect(() => parse({ op: 'moveObject', id: 1.5, at: [0, 0, 0] })).toThrow(
      '«id»',
    );
    expect(() => parse({ op: 'moveObject', id: 1, at: [-1, 0, 0] })).toThrow(
      'не могут быть меньше нуля',
    );
  });

  it('в пачке объекты не считаются в объём клеток', () => {
    const ops = Array.from({ length: 5 }, () => ({
      op: 'placeObject',
      at: [0, 0, 0],
      object: { kind: 'start' },
    }));
    expect(parseMapOpBatch(ops, { ...limits, maxBatchVolume: 1 })).toHaveLength(
      5,
    );
  });
});
