import { describe, expect, it } from 'vitest';
import type { BlockGroupFields } from 'shared';
import { blockKinds, blockTraitRows } from './blockCard';
import { blockDeleteConfirmText } from './blockDeleteConfirm';

const plain: BlockGroupFields = {
  look: 'stone',
  color: '#8a8a8a',
  opaque: true,
  durability: { armorClass: 17, hitPoints: 27 },
  flammable: false,
  movementCost: 1,
  climbable: false,
  hazard: null,
  textures: null,
  shapes: {},
};

describe('blockCard', () => {
  it('у группы без заметных свойств вид «Обычный»', () => {
    expect(blockKinds(plain)).toEqual(['plain']);
  });

  it('у группы бывает несколько видов', () => {
    expect(
      blockKinds({ ...plain, hazard: 'lava', movementCost: 2, opaque: false }),
    ).toEqual(['hazard', 'difficult', 'seeThrough']);
  });

  it('строки карточки называют опасность и прочность', () => {
    const rows = blockTraitRows({ ...plain, hazard: 'lava', durability: null });
    expect(rows).toContainEqual({
      label: 'Опасность',
      value: 'Лава: 10к10 (Огонь)',
    });
    expect(rows).toContainEqual({
      label: 'Прочность',
      value: 'Не разрушается',
    });
    expect(rows.find((row) => row.label === 'Горит')).toBeUndefined();
  });
});

describe('blockDeleteConfirmText', () => {
  it('без карт — только вопрос', () => {
    expect(blockDeleteConfirmText('Угли', { maps: [], scenes: [] })).toBe(
      'Удалить группу блоков «Угли» безвозвратно?',
    );
  });

  it('называет карты и сцены, где блоки станут пустотой', () => {
    const text = blockDeleteConfirmText('Угли', {
      maps: [
        { id: '1', name: 'Пещера' },
        { id: '2', name: 'Кузня' },
      ],
      scenes: [{ id: '3', name: 'Логово', gameId: '4', gameName: 'Поход' }],
    });
    expect(text).toBe(
      'Удалить группу блоков «Угли» безвозвратно?\n\n' +
        'Её блоки стоят на картах: «Пещера», «Кузня»; на сценах: «Логово» (игра «Поход»). ' +
        'Там они станут пустотой.',
    );
  });
});
