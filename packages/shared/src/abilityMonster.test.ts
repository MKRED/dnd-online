import { describe, expect, it } from 'vitest';
import {
  activationFitsCategory,
  formatRecharge,
  isMonsterAbilityDetails,
} from './abilityMonster.js';
import { isAbilityActivation } from './abilityUsage.js';
import { formatActivation } from './abilityUsageLabels.js';

describe('isMonsterAbilityDetails', () => {
  it('принимает перезарядку от 2 до 6 и её отсутствие', () => {
    expect(isMonsterAbilityDetails({ recharge: null })).toBe(true);
    expect(isMonsterAbilityDetails({ recharge: 2 })).toBe(true);
    expect(isMonsterAbilityDetails({ recharge: 6 })).toBe(true);
  });

  it('отклоняет неверные поля', () => {
    expect(isMonsterAbilityDetails({})).toBe(false);
    expect(isMonsterAbilityDetails({ recharge: 1 })).toBe(false);
    expect(isMonsterAbilityDetails({ recharge: 7 })).toBe(false);
    expect(isMonsterAbilityDetails({ recharge: 5.5 })).toBe(false);
    expect(isMonsterAbilityDetails({ recharge: '5' })).toBe(false);
    expect(isMonsterAbilityDetails({ recharge: 5, level: 1 })).toBe(false);
    expect(isMonsterAbilityDetails(null)).toBe(false);
  });
});

describe('активации монстра', () => {
  it('проверяет черту и цену легендарного действия', () => {
    expect(isAbilityActivation({ kind: 'trait' })).toBe(true);
    expect(isAbilityActivation({ kind: 'legendary', cost: 1 })).toBe(true);
    expect(isAbilityActivation({ kind: 'legendary', cost: 3 })).toBe(true);
    expect(isAbilityActivation({ kind: 'legendary', cost: 4 })).toBe(false);
    expect(isAbilityActivation({ kind: 'legendary', cost: 0 })).toBe(false);
    expect(isAbilityActivation({ kind: 'legendary' })).toBe(false);
    expect(isAbilityActivation({ kind: 'trait', trigger: '' })).toBe(false);
  });

  it('разрешает их только категории «Монстра»', () => {
    const trait = { kind: 'trait' } as const;
    const legendary = { kind: 'legendary', cost: 1 } as const;
    expect(activationFitsCategory('monster', trait)).toBe(true);
    expect(activationFitsCategory('monster', legendary)).toBe(true);
    expect(activationFitsCategory('basic', trait)).toBe(false);
    expect(activationFitsCategory('spell', legendary)).toBe(false);
    expect(activationFitsCategory('basic', { kind: 'action' })).toBe(true);
    expect(activationFitsCategory('monster', { kind: 'action' })).toBe(true);
  });
});

describe('формат', () => {
  it('пишет цену легендарного действия, только если она больше 1', () => {
    expect(formatActivation({ kind: 'trait' })).toBe('Черта');
    expect(formatActivation({ kind: 'legendary', cost: 1 })).toBe(
      'Легендарное действие',
    );
    expect(formatActivation({ kind: 'legendary', cost: 2 })).toBe(
      'Легендарное действие, стоит 2 действия',
    );
  });

  it('пишет перезарядку как в книге', () => {
    expect(formatRecharge(5)).toBe('Перезарядка 5–6');
    expect(formatRecharge(6)).toBe('Перезарядка 6');
  });
});
