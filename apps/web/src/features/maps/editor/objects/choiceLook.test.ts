import { describe, expect, it } from 'vitest';
import type { ObjectImagePaths } from '../../MapScene/objects/objectImages';
import { choiceLook } from './choiceLook';

const images: ObjectImagePaths = {
  monster: (id, v) => `m/${id}/${v}`,
  item: (id, v) => `i/${id}/${v}`,
  npc: (id, image) => `n/${id}/${image.id}`,
  npcModel: (id, v) => `nm/${id}/${v}`,
  furnitureMesh: (id, v) => `f/${id}/${v}`,
  monsterModel: (id, model, v) => `mm/${id}/${model}/${v}`,
};

describe('choiceLook', () => {
  it('монстр — с картинкой из выбора, размером и взглядом', () => {
    expect(
      choiceLook(
        {
          kind: 'creature',
          entry: {
            kind: 'monster',
            id: 'g',
            name: 'гоблин',
            label: 'Гоблин',
            size: 'small',
            imageVersion: 3,
          },
        },
        90,
        images,
      ),
    ).toMatchObject({
      kind: 'creature',
      side: 'monster',
      size: 'small',
      facing: 90,
      image: 'm/g/3',
      letter: 'Г',
    });
  });

  it('НПС — Средний, без картинки — буква', () => {
    expect(
      choiceLook(
        {
          kind: 'creature',
          entry: { kind: 'npc', id: 'n', name: 'Трактирщик', label: '' },
        },
        0,
        images,
      ),
    ).toMatchObject({ side: 'npc', size: 'medium', image: null, letter: 'Т' });
  });

  it('обстановка поворачивается на 90° и меняет ширину с глубиной', () => {
    const look = choiceLook(
      {
        kind: 'furniture',
        entry: {
          kind: 'furniture',
          id: 'd',
          name: 'Дверь',
          label: 'Дверь',
          modelSize: [2, 3, 1],
        },
      },
      135,
      images,
    );
    expect(look).toMatchObject({
      kind: 'furniture',
      facing: 90,
      extent: [1, 3, 2],
      model: null,
    });
  });

  it('сундук и старт — с тем же взглядом', () => {
    expect(choiceLook({ kind: 'container', look: 'chest' }, 180)).toEqual({
      kind: 'container',
      look: 'chest',
      facing: 180,
    });
    expect(choiceLook({ kind: 'start' }, 45)).toMatchObject({
      kind: 'start',
      facing: 45,
    });
  });
});
