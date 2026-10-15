import { describe, expect, it } from 'vitest';
import type { EffectDto } from './dto/effect.dto.js';
import { EFFECTS_CONFIG, toEffectVariant } from './effects.config.js';

describe('effects.config', () => {
  it('читает длительность из extra', () => {
    const duration = { kind: 'rest', rest: 'long' };
    expect(toEffectVariant('basic', {}, { duration }).duration).toEqual(
      duration,
    );
  });

  // Записи, созданные до длительности, и испорченный jsonb не ломают каталог.
  it('без длительности или с неверной считает эффект бессрочным', () => {
    expect(toEffectVariant('basic', {}, {}).duration).toEqual({
      kind: 'permanent',
    });
    expect(
      toEffectVariant('basic', {}, { duration: { kind: 'time' } }).duration,
    ).toEqual({ kind: 'permanent' });
  });

  it('пишет длительность из тела в extra', () => {
    const duration = { kind: 'turn', edge: 'end', owner: 'bearer' } as const;
    expect(EFFECTS_CONFIG.toExtra?.({ duration } as EffectDto)).toEqual({
      duration,
    });
  });
});
