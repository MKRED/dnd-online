import { describe, expect, it } from 'vitest';
import type { AbilityDto } from './dto/ability.dto.js';
import { ABILITIES_CONFIG, toAbilityVariant } from './abilities.config.js';

describe('abilities.config', () => {
  const costs = {
    uses: { count: { kind: 'fixed', amount: 2 }, recovery: 'short' },
    spellSlot: null,
    movement: { kind: 'half' },
    hitDie: false,
  };

  it('читает активацию и затраты из extra', () => {
    const activation = { kind: 'reaction', trigger: 'когда вас бьют' };
    expect(toAbilityVariant('basic', {}, { activation, costs })).toMatchObject({
      activation,
      costs,
    });
  });

  // Записи без этих полей и испорченный jsonb не ломают каталог.
  it('без полей или с неверными — действие без затрат', () => {
    const fallback = {
      activation: { kind: 'action' },
      costs: { uses: null, spellSlot: null, movement: null, hitDie: false },
    };
    expect(toAbilityVariant('basic', {}, {})).toMatchObject(fallback);
    expect(
      toAbilityVariant('basic', {}, { activation: { kind: 'x' }, costs: 1 }),
    ).toMatchObject(fallback);
  });

  it('пишет активацию и затраты из тела в extra', () => {
    const dto = { activation: { kind: 'action' }, costs } as AbilityDto;
    expect(ABILITIES_CONFIG.toExtra?.(dto)).toEqual({
      activation: { kind: 'action' },
      costs,
    });
  });
});
