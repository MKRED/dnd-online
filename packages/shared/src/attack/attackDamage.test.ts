import { describe, expect, it } from 'vitest';
import type { EffectComponent } from '../effectComponents.js';
import { effectDamageTerms, rollDamage } from './attackDamage.js';
import type { DamageTermInput } from './attackTerms.js';
import { damageDefenses, defendedAmount } from './damageDefenses.js';

// Кость всегда выпадает наибольшей гранью минус ноль: random → 0.999.
const max = () => 0.999;

const sword: DamageTermInput[] = [
  { kind: 'dice', label: 'Меч', count: 1, die: 8, sign: 1, type: 'slashing' },
  { kind: 'number', label: 'Сила', amount: 3, type: 'slashing' },
  { kind: 'dice', label: 'Доп. урон', count: 1, die: 6, sign: 1, type: 'fire' },
];

describe('урон атаки', () => {
  it('складывает по типам', () => {
    const roll = rollDamage(sword, false, {}, max);
    expect(roll.byType).toEqual([
      { type: 'slashing', rolled: 11, dealt: 11, defenses: [] },
      { type: 'fire', rolled: 6, dealt: 6, defenses: [] },
    ]);
    expect(roll.total).toBe(17);
  });

  it('на крите кости вдвое, модификатор — раз', () => {
    const roll = rollDamage(sword, true, {}, max);
    expect(roll.terms[0]).toMatchObject({
      count: 2,
      rolls: [8, 8],
      amount: 16,
    });
    expect(roll.byType[0].rolled).toBe(19);
    expect(roll.byType[1].rolled).toBe(12);
  });

  it('защиты цели: сопротивление вниз, иммунитет — ноль', () => {
    const roll = rollDamage(
      sword,
      false,
      { slashing: ['resistance'], fire: ['immunity'] },
      max,
    );
    expect(roll.byType.map((p) => p.dealt)).toEqual([5, 0]);
    expect(roll.total).toBe(5);
  });

  it('вычет не делает урон отрицательным', () => {
    const roll = rollDamage(
      [
        { kind: 'number', label: 'Удар', amount: 1, type: 'bludgeoning' },
        { kind: 'number', label: 'Сила', amount: -2, type: 'bludgeoning' },
      ],
      false,
      {},
    );
    expect(roll.total).toBe(0);
  });
});

describe('защиты', () => {
  it('сначала сопротивление, потом уязвимость', () => {
    expect(defendedAmount(7, ['resistance'])).toBe(3);
    expect(defendedAmount(7, ['vulnerability'])).toBe(14);
    expect(defendedAmount(7, ['vulnerability', 'resistance'])).toBe(6);
    expect(defendedAmount(7, ['immunity', 'vulnerability'])).toBe(0);
  });

  it('из стат-блока, эффектов и состояний', () => {
    const stoneskin: EffectComponent = {
      kind: 'defense',
      level: 'resistance',
      damageTypes: ['piercing'],
      conditions: [],
    };
    const defenses = damageDefenses(
      [
        { source: 'Каменная кожа', components: [stoneskin] },
        {
          source: 'Окаменение',
          components: [{ kind: 'condition', condition: 'petrified' }],
        },
      ],
      { resistances: [], vulnerabilities: ['fire'], immunities: ['poison'] },
    );
    expect(defenses.fire).toEqual(['vulnerability', 'resistance']);
    expect(defenses.poison).toEqual(['immunity', 'resistance']);
    expect(defenses.piercing).toEqual(['resistance']);
  });
});

describe('прибавки к урону из эффектов', () => {
  it('свой тип у Divine Favor, тип атаки — у Enlarge', () => {
    const bonus = (damageType: 'radiant' | null): EffectComponent => ({
      kind: 'roll_bonus',
      mode: 'bonus',
      roll: 'damage',
      ability: null,
      count: 1,
      die: 4,
      number: 0,
      damageType,
    });
    const terms = effectDamageTerms(
      {
        effects: [
          { source: 'df', components: [bonus('radiant')] },
          { source: 'en', components: [bonus(null)] },
        ],
        nameOf: (s) =>
          s === 'df' ? 'Божественное благоволение' : 'Увеличение',
      },
      'slashing',
    );
    expect(terms.map((t) => [t.label, t.type])).toEqual([
      ['Божественное благоволение', 'radiant'],
      ['Увеличение', 'slashing'],
    ]);
  });
});
