import { describe, expect, it } from 'vitest';
import { NO_ABILITY_COSTS, type AbilityCosts } from './abilityUsage.js';
import {
  formatAbilityCosts,
  formatMonsterLimit,
  monsterLimitOf,
  monsterLimitStored,
  type MonsterLimit,
} from './monsterAbilityLimit.js';

const uses = (
  amount: number,
  recovery: 'long' | 'short' | 'short_one',
): AbilityCosts => ({
  ...NO_ABILITY_COSTS,
  uses: { count: { kind: 'fixed', amount }, recovery },
});

describe('monsterLimitOf', () => {
  it('читает четыре вида из зарядов и перезарядки', () => {
    expect(monsterLimitOf(NO_ABILITY_COSTS, null)).toEqual({ kind: 'none' });
    expect(monsterLimitOf(uses(3, 'long'), null)).toEqual({
      kind: 'per_day',
      amount: 3,
    });
    expect(monsterLimitOf(uses(1, 'short'), null)).toEqual({ kind: 'rest' });
    expect(monsterLimitOf(NO_ABILITY_COSTS, 5)).toEqual({
      kind: 'recharge',
      from: 5,
    });
  });

  it('заряды героя и два ограничения сразу — null', () => {
    expect(monsterLimitOf(uses(2, 'short'), null)).toBeNull();
    expect(monsterLimitOf(uses(1, 'short_one'), null)).toBeNull();
    expect(monsterLimitOf(uses(1, 'long'), 5)).toBeNull();
    expect(
      monsterLimitOf(
        {
          ...NO_ABILITY_COSTS,
          uses: { count: { kind: 'proficiency' }, recovery: 'long' },
        },
        null,
      ),
    ).toBeNull();
  });

  it('хранение и чтение — туда и обратно', () => {
    const limits: MonsterLimit[] = [
      { kind: 'none' },
      { kind: 'per_day', amount: 2 },
      { kind: 'recharge', from: 4 },
      { kind: 'rest' },
    ];
    for (const limit of limits) {
      const { uses: stored, recharge } = monsterLimitStored(limit);
      expect(
        monsterLimitOf({ ...NO_ABILITY_COSTS, uses: stored }, recharge),
      ).toEqual(limit);
    }
  });
});

describe('подписи', () => {
  it('как в книге', () => {
    expect(formatMonsterLimit({ kind: 'none' })).toBeNull();
    expect(formatMonsterLimit({ kind: 'per_day', amount: 3 })).toBe('3/день');
    expect(formatMonsterLimit({ kind: 'recharge', from: 5 })).toBe(
      'Перезарядка 5–6',
    );
    expect(formatMonsterLimit({ kind: 'rest' })).toBe(
      'Перезарядка после короткого или долгого отдыха',
    );
  });

  it('затраты монстра начинаются с ограничения, у других — как были', () => {
    const costs: AbilityCosts = {
      ...uses(1, 'long'),
      movement: { kind: 'half' },
    };
    expect(formatAbilityCosts('monster', costs, null)).toEqual([
      '1/день',
      'Половина скорости',
    ]);
    expect(formatAbilityCosts('feature', uses(1, 'long'), null)).toEqual([
      '1 заряд — все после долгого отдыха',
    ]);
  });
});
