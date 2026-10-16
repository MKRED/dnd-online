import { describe, expect, it } from 'vitest';
import type { EffectDto } from './dto/effect.dto.js';
import { EFFECTS_CONFIG, toEffectFields } from './effects.config.js';

const dark = { kind: 'sense', sense: 'darkvision', range: 60 } as const;

describe('effects.config', () => {
  it('читает составляющие, длительность и спасбросок', () => {
    const duration = { kind: 'rest', rest: 'long' };
    const saveEnds = { ability: 'wisdom', edge: 'end' };
    expect(
      toEffectFields('basic', { components: [dark] }, { duration, saveEnds }),
    ).toEqual({ components: [dark], duration, saveEnds });
  });

  // Записи, созданные до этих полей, и испорченный jsonb не ломают каталог.
  it('без полей или с неверными — бессрочный эффект без составляющих', () => {
    const fallback = {
      components: [],
      duration: { kind: 'permanent' },
      saveEnds: null,
    };
    expect(toEffectFields('basic', {}, {})).toEqual(fallback);
    expect(
      toEffectFields(
        'basic',
        { components: [{ kind: 'aura' }] },
        { duration: { kind: 'time' }, saveEnds: { ability: 'luck' } },
      ),
    ).toEqual(fallback);
  });

  it('недостающее поле — умолчание, испорченная составляющая пропускается', () => {
    const fly = { kind: 'speed', change: 'fly', feet: 60 };
    expect(
      toEffectFields('basic', { components: [fly, { kind: 'aura' }, dark] }, {})
        .components,
    ).toEqual([{ ...fly, hover: false }, dark]);
  });

  it('эффект категории «Чувство» до составляющих читает одной составляющей', () => {
    expect(
      toEffectFields('sense', { sense: 'darkvision', range: 60 }, {})
        .components,
    ).toEqual([dark]);
    expect(
      toEffectFields('sense', { sense: 'darkvision', range: null }, {})
        .components,
    ).toEqual([]);
  });

  it('пишет составляющие в details, длительность и спасбросок — в extra', () => {
    const duration = { kind: 'turn', edge: 'end', owner: 'bearer' } as const;
    const dto = { components: [dark], duration, saveEnds: null } as EffectDto;
    expect(EFFECTS_CONFIG.toStored(dto)).toEqual({
      category: 'basic',
      details: { components: [dark] },
      extra: { duration, saveEnds: null },
    });
  });
});
