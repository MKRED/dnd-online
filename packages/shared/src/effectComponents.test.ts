import { describe, expect, it } from 'vitest';
import {
  EFFECT_COMPONENTS_MAX,
  effectComponentKinds,
  isEffectComponents,
} from './effectComponents.js';

const dark = { kind: 'sense', sense: 'darkvision', range: 60 };

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

  it('виды без повторов', () => {
    expect(
      effectComponentKinds([
        { kind: 'sense', sense: 'darkvision', range: 60 },
        { kind: 'sense', sense: 'blindsight', range: 10 },
      ]),
    ).toEqual(['sense']);
    expect(effectComponentKinds([])).toEqual([]);
  });
});
