import {
  DEFAULT_MONSTER_STAT_BLOCK,
  type EffectComponent,
  type MonsterEffectEntry,
} from 'shared';
import { describe, expect, it } from 'vitest';
import { sampleMonster } from '../../../test/monsterFixture';
import { monsterSpecials, monsterTotals } from './monsterTotals';

const effect = (
  name: string,
  components: EffectComponent[],
): MonsterEffectEntry => ({
  id: `row-${name}`,
  effect: {
    id: name,
    name,
    isPublic: true,
    image: null,
    components,
    duration: { kind: 'permanent' },
    saveEnds: null,
  },
  missing: null,
  inactive: false,
});

describe('итог карточки монстра', () => {
  it('особые скорости стат-блока; «парит» — только с полётом', () => {
    expect(monsterSpecials(sampleMonster.statBlock.speed)).toEqual({
      special: { swim: 40 },
      hover: false,
    });
    expect(
      monsterSpecials({ ...DEFAULT_MONSTER_STAT_BLOCK.speed, hover: true }),
    ).toEqual({ special: {}, hover: false });
  });

  it('эффекты меняют КД и скорости, свои скорости остаются', () => {
    const totals = monsterTotals(sampleMonster.statBlock, [
      effect('Каменная кожа', [
        { kind: 'armor_class', change: 'bonus', value: 2 },
      ]),
      effect('Ускорение', [
        { kind: 'speed', change: 'double', feet: null, hover: false },
      ]),
    ]);
    expect(totals.armorClass).toBe(19);
    expect(totals.speed).toEqual({
      speed: 20,
      special: { swim: 80 },
      hover: false,
    });
  });
});
