import { describe, expect, it } from 'vitest';
import type { EffectComponent } from './effectComponents.js';
import type { MonsterEffectEntry } from './monsterLinks.js';
import {
  DEFAULT_MONSTER_STAT_BLOCK,
  type MonsterStatBlock,
} from './monsters.js';
import { monsterSpecials, monsterTotals } from './monsterTotals.js';

// Аболет из книги 2024: КД 17, ходьба 10, плавание 40.
const statBlock: MonsterStatBlock = {
  ...DEFAULT_MONSTER_STAT_BLOCK,
  armorClass: 17,
  speed: { ...DEFAULT_MONSTER_STAT_BLOCK.speed, walk: 10, swim: 40 },
};

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
    expect(monsterSpecials(statBlock.speed)).toEqual({
      special: { swim: 40 },
      hover: false,
    });
    expect(
      monsterSpecials({ ...DEFAULT_MONSTER_STAT_BLOCK.speed, hover: true }),
    ).toEqual({ special: {}, hover: false });
  });

  it('эффекты меняют КД и скорости, свои скорости остаются', () => {
    const totals = monsterTotals(statBlock, [
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
