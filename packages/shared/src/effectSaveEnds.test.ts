import { describe, expect, it } from 'vitest';
import { formatSaveEnds, isEffectSaveEnds } from './effectSaveEnds.js';

describe('effectSaveEnds', () => {
  it('принимает null и характеристику с началом или концом хода', () => {
    expect(isEffectSaveEnds(null)).toBe(true);
    expect(isEffectSaveEnds({ ability: 'wisdom', edge: 'end' })).toBe(true);
    expect(isEffectSaveEnds({ ability: 'constitution', edge: 'start' })).toBe(
      true,
    );
  });

  it('не пускает неизвестную характеристику, момент и лишние поля', () => {
    expect(isEffectSaveEnds({ ability: 'luck', edge: 'end' })).toBe(false);
    expect(isEffectSaveEnds({ ability: 'wisdom', edge: 'middle' })).toBe(false);
    expect(isEffectSaveEnds({ ability: 'wisdom' })).toBe(false);
    expect(isEffectSaveEnds({ ability: 'wisdom', edge: 'end', dc: 13 })).toBe(
      false,
    );
    expect(isEffectSaveEnds(undefined)).toBe(false);
  });

  it('пишет характеристику в родительном падеже', () => {
    expect(formatSaveEnds({ ability: 'wisdom', edge: 'end' })).toBe(
      'Спасбросок Мудрости в конце каждого своего хода',
    );
    expect(formatSaveEnds({ ability: 'constitution', edge: 'start' })).toBe(
      'Спасбросок Телосложения в начале каждого своего хода',
    );
  });
});
