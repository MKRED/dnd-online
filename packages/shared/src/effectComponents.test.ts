import { describe, expect, it } from 'vitest';
import {
  EFFECT_COMPONENTS_MAX,
  effectComponentKinds,
  formatEffectComponent,
  isEffectComponents,
} from './effectComponents.js';

const dark = { kind: 'sense', sense: 'darkvision', range: 60 } as const;
const poisoned = { kind: 'condition', condition: 'poisoned' } as const;

describe('effectComponents', () => {
  it('принимает пустой список и несколько разных чувств', () => {
    expect(isEffectComponents([])).toBe(true);
    expect(
      isEffectComponents([
        dark,
        { kind: 'sense', sense: 'see_invisible', range: null },
      ]),
    ).toBe(true);
  });

  it('не пускает неизвестный вид, неверное чувство и не список', () => {
    expect(isEffectComponents([{ kind: 'aura' }])).toBe(false);
    expect(isEffectComponents([{ ...dark, range: 62 }])).toBe(false);
    expect(isEffectComponents([{ sense: 'darkvision', range: 60 }])).toBe(
      false,
    );
    expect(isEffectComponents([null])).toBe(false);
    expect(isEffectComponents({ 0: dark })).toBe(false);
    expect(isEffectComponents(undefined)).toBe(false);
  });

  it('не пускает одно чувство дважды и больше предела', () => {
    expect(isEffectComponents([dark, { ...dark, range: 120 }])).toBe(false);
    const many = Array.from({ length: EFFECT_COMPONENTS_MAX + 1 }, () => ({
      kind: 'sense',
      sense: 'see_invisible',
      range: null,
    }));
    expect(isEffectComponents(many)).toBe(false);
  });

  it('принимает разные состояния вместе с чувством', () => {
    expect(
      isEffectComponents([
        poisoned,
        { kind: 'condition', condition: 'prone' },
        dark,
      ]),
    ).toBe(true);
  });

  it('не пускает одно состояние дважды, неизвестное и лишние поля', () => {
    expect(isEffectComponents([poisoned, poisoned])).toBe(false);
    expect(
      isEffectComponents([{ kind: 'condition', condition: 'cursed' }]),
    ).toBe(false);
    expect(isEffectComponents([{ ...poisoned, level: 2 }])).toBe(false);
    expect(isEffectComponents([{ kind: 'condition' }])).toBe(false);
  });

  it('урон за ход может повторяться', () => {
    const burn = {
      kind: 'per_turn',
      outcome: 'damage',
      damageType: 'fire',
      count: 1,
      die: 6,
      bonus: 0,
      addModifier: false,
      edge: 'start',
    };
    expect(isEffectComponents([burn, burn, poisoned])).toBe(true);
    expect(isEffectComponents([{ ...burn, count: 0 }])).toBe(false);
  });

  it('виды без повторов', () => {
    expect(
      effectComponentKinds([
        { kind: 'sense', sense: 'darkvision', range: 60 },
        { kind: 'sense', sense: 'blindsight', range: 10 },
      ]),
    ).toEqual(['sense']);
    expect(
      effectComponentKinds([
        { kind: 'condition', condition: 'poisoned' },
        { kind: 'sense', sense: 'darkvision', range: 60 },
      ]),
    ).toEqual(['condition', 'sense']);
    expect(effectComponentKinds([])).toEqual([]);
  });

  it('строка карточки по виду', () => {
    expect(formatEffectComponent(poisoned)).toBe('Отравленный');
    expect(formatEffectComponent(dark)).toBe('Тёмное зрение, 60 фт.');
  });
});
