import { describe, expect, it } from 'vitest';
import {
  moveOp,
  objectCell,
  placeBody,
  placeSpan,
  type PlaceSettings,
} from './objectPlacement';

const OGRE = {
  kind: 'monster' as const,
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Огр',
  label: 'Огр · Большой',
  size: 'large' as const,
};
const HERO = {
  kind: 'npc' as const,
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Аня',
  label: 'Аня',
};

const settings = (patch: Partial<PlaceSettings>): PlaceSettings => ({
  kind: 'start',
  creature: null,
  item: null,
  look: 'chest',
  facing: 90,
  ...patch,
});

const size = { width: 6, depth: 6 };

describe('placeBody', () => {
  it('старт и контейнер — без выбора в каталоге, контейнер зовётся по виду', () => {
    expect(placeBody(settings({}))).toEqual({ kind: 'start', facing: 90 });
    expect(placeBody(settings({ kind: 'container', look: 'barrel' }))).toEqual({
      kind: 'container',
      name: 'Бочка',
      look: 'barrel',
      items: [],
    });
  });

  it('монстр или НПС из одного поиска; НПС — Средний', () => {
    expect(placeBody(settings({ kind: 'creature', creature: OGRE }))).toEqual({
      kind: 'monster',
      monsterId: OGRE.id,
      facing: 90,
    });
    expect(placeBody(settings({ kind: 'creature', creature: HERO }))).toEqual({
      kind: 'npc',
      characterId: HERO.id,
      size: 'medium',
      facing: 90,
    });
  });

  it('существо или предмет не выбраны — ставить нечего', () => {
    expect(placeBody(settings({ kind: 'creature' }))).toBeNull();
    expect(placeBody(settings({ kind: 'item' }))).toBeNull();
  });
});

describe('место на карте', () => {
  it('место Большого — 2 клетки, курсор в его середине', () => {
    const span = placeSpan(settings({ kind: 'creature', creature: OGRE }));
    expect(span).toBe(2);
    expect(placeSpan(settings({ kind: 'creature', creature: HERO }))).toBe(1);
    expect(objectCell([3, 1, 3], 2, size)).toEqual([3, 1, 3]);
    // Огромный (3): курсор в средней клетке.
    expect(objectCell([3, 1, 3], 3, size)).toEqual([2, 1, 2]);
  });

  it('место не влезает в карту — null', () => {
    expect(objectCell([5, 1, 2], 2, size)).toBeNull();
    expect(objectCell([0, 1, 0], 3, size)).toBeNull();
    expect(objectCell([5, 1, 5], 1, size)).toEqual([5, 1, 5]);
  });

  it('перенос: в ту же клетку и за границу — без операции', () => {
    const object = { id: 7, at: [1, 1, 1] as [number, number, number] };
    expect(moveOp(object, [4, 2, 0], 1, size)).toEqual({
      op: 'moveObject',
      id: 7,
      at: [4, 2, 0],
    });
    expect(moveOp(object, [1, 1, 1], 1, size)).toBeNull();
    expect(moveOp(object, [5, 1, 1], 2, size)).toBeNull();
  });
});
