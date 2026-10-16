import { describe, expect, it } from 'vitest';
import {
  formatPerTurn,
  isPerTurnDetails,
  type PerTurnDetails,
} from './effectPerTurn.js';

// «Палящая кара»: 1d6 огнём в начале хода.
const searing: PerTurnDetails = {
  outcome: 'damage',
  damageType: 'fire',
  count: 1,
  die: 6,
  bonus: 0,
  addModifier: false,
  edge: 'start',
};

describe('effectPerTurn', () => {
  it('принимает урон с типом, лечение числом и временные хиты от модификатора', () => {
    expect(isPerTurnDetails(searing)).toBe(true);
    const regenerate = {
      ...searing,
      outcome: 'healing',
      damageType: null,
      count: 0,
      bonus: 1,
    };
    expect(isPerTurnDetails(regenerate)).toBe(true);
    const heroism = {
      ...regenerate,
      outcome: 'temp_hp',
      bonus: 0,
      addModifier: true,
    };
    expect(isPerTurnDetails(heroism)).toBe(true);
  });

  it('тип урона — только у урона и обязателен у него', () => {
    expect(isPerTurnDetails({ ...searing, damageType: null })).toBe(false);
    expect(isPerTurnDetails({ ...searing, damageType: 'holy' })).toBe(false);
    expect(isPerTurnDetails({ ...searing, outcome: 'healing' })).toBe(false);
  });

  it('не пускает пустую сумму, неверные кости, числа и лишние поля', () => {
    expect(isPerTurnDetails({ ...searing, count: 0 })).toBe(false);
    expect(isPerTurnDetails({ ...searing, die: 20 })).toBe(false);
    expect(isPerTurnDetails({ ...searing, count: 41 })).toBe(false);
    expect(isPerTurnDetails({ ...searing, count: 1.5 })).toBe(false);
    expect(isPerTurnDetails({ ...searing, bonus: -1 })).toBe(false);
    expect(isPerTurnDetails({ ...searing, bonus: 101 })).toBe(false);
    expect(isPerTurnDetails({ ...searing, addModifier: 'yes' })).toBe(false);
    expect(isPerTurnDetails({ ...searing, edge: 'middle' })).toBe(false);
    expect(isPerTurnDetails({ ...searing, scaling: 1 })).toBe(false);
    expect(isPerTurnDetails(null)).toBe(false);
  });

  it('строка карточки', () => {
    expect(formatPerTurn(searing)).toBe(
      'Урон: 1d6 (Огонь), в начале каждого своего хода',
    );
    expect(
      formatPerTurn({
        ...searing,
        outcome: 'temp_hp',
        damageType: null,
        count: 0,
        bonus: 2,
        addModifier: true,
        edge: 'end',
      }),
    ).toBe(
      'Временные хиты: 2 + модификатор наложившего, в конце каждого своего хода',
    );
  });
});
