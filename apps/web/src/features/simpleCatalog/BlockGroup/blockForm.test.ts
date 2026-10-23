import { describe, expect, it } from 'vitest';
import { MATERIALS, type BlockGroupFields } from 'shared';
import {
  blockValidate,
  colorAfterLookChange,
  fromBlockValues,
  toBlockValues,
} from './blockForm';

const embers: BlockGroupFields = {
  look: 'scorched',
  color: '#5a2a1a',
  opaque: true,
  durability: null,
  flammable: false,
  movementCost: 2,
  climbable: false,
  hazard: 'fire',
  textures: null,
  shapes: {},
};

describe('blockForm', () => {
  it('новая группа — камень со своей прочностью', () => {
    const values = toBlockValues();
    expect(values.look).toBe('stone');
    expect(fromBlockValues(values)).toEqual({
      look: 'stone',
      color: MATERIALS.stone.color,
      opaque: true,
      durability: { armorClass: 17, hitPoints: 27 },
      flammable: false,
      movementCost: 1,
      climbable: false,
      hazard: null,
      textures: null,
      shapes: {},
    });
  });

  it('группа проходит через форму без изменений', () => {
    expect(fromBlockValues(toBlockValues(embers))).toEqual(embers);
  });

  it('неразрушимая группа подставляет в форму числа своей основы', () => {
    // Включили «Разрушается» — поля уже заполнены разумно, а не пустые.
    const values = toBlockValues({ ...embers, look: 'stone' });
    expect(values.breakable).toBe(false);
    expect([values.armorClass, values.hitPoints]).toEqual([17, 27]);
  });

  it('цвет пишется строчными, как его ждёт сервер', () => {
    const values = { ...toBlockValues(embers), color: '#5A2A1A' };
    expect(fromBlockValues(values).color).toBe('#5a2a1a');
  });

  it('цвет идёт за основой, только если его не меняли', () => {
    const values = toBlockValues();
    expect(colorAfterLookChange(values, 'brick')).toBe(MATERIALS.brick.color);
    expect(colorAfterLookChange({ ...values, color: '#123456' }, 'brick')).toBe(
      '#123456',
    );
  });

  it('проверяет прочность, только когда блок разрушается', () => {
    const values = { block: { ...toBlockValues(), armorClass: 99 } };
    expect(blockValidate.armorClass(99, values)).toMatch(/^КД/);
    const unbreakable = { block: { ...values.block, breakable: false } };
    expect(blockValidate.armorClass(99, unbreakable)).toBeNull();
    expect(blockValidate.hitPoints('', values)).toMatch(/^ХП/);
    expect(blockValidate.color('#12345')).not.toBeNull();
  });
});
