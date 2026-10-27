import { describe, expect, it } from 'vitest';
import { spendBlock, turnSpendOf } from './combatAbilityUse.js';
import type { CombatantResources } from './game-combat.js';

const resources = (used: [number, number, number]): CombatantResources => ({
  actions: { max: 1, used: used[0] },
  bonusActions: { max: 1, used: used[1] },
  reactions: { max: 1, used: used[2] },
  dodging: false,
  disengaged: false,
});

describe('turnSpendOf', () => {
  it('действие, бонусное, реакция и без действия тратят своё', () => {
    expect(turnSpendOf({ kind: 'action' })).toBe('action');
    expect(turnSpendOf({ kind: 'attack' })).toBe('action');
    expect(turnSpendOf({ kind: 'bonus_action' })).toBe('bonus_action');
    expect(turnSpendOf({ kind: 'reaction', trigger: '' })).toBe('reaction');
    expect(turnSpendOf({ kind: 'free', trigger: '' })).toBe('free');
  });

  it('черту, долгое и легендарное в бою не применить', () => {
    expect(turnSpendOf({ kind: 'trait' })).toBeNull();
    expect(turnSpendOf({ kind: 'time', amount: 1, unit: 'minute' })).toBeNull();
    expect(turnSpendOf({ kind: 'legendary', cost: 1 })).toBeNull();
  });
});

describe('spendBlock', () => {
  it('действие и бонусное — только в свой ход и пока есть', () => {
    expect(spendBlock('action', resources([0, 0, 0]), true)).toBeNull();
    expect(spendBlock('action', resources([0, 0, 0]), false)).toBe(
      'Сейчас не ваш ход',
    );
    expect(spendBlock('action', resources([1, 0, 0]), true)).toBe(
      'В этом ходу действий больше нет',
    );
    expect(spendBlock('bonus_action', resources([1, 1, 0]), true)).toBe(
      'Бонусное действие уже потрачено',
    );
  });

  it('реакция и без действия — и в чужой ход', () => {
    expect(spendBlock('reaction', resources([1, 1, 0]), false)).toBeNull();
    expect(spendBlock('reaction', resources([0, 0, 1]), true)).toBe(
      'Реакция уже потрачена',
    );
    expect(spendBlock('free', resources([1, 1, 1]), false)).toBeNull();
  });
});
