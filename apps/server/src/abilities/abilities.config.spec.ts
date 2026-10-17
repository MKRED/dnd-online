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

  it('читает поля заклинания, испорченные — как базовую', () => {
    const details = {
      level: 0,
      school: 'evocation',
      components: 'В, С',
      ritual: false,
      duration: { kind: 'instant' },
    };
    expect(toAbilityVariant('spell', details, {})).toMatchObject({
      category: 'spell',
      details,
    });
    expect(
      toAbilityVariant('spell', { ...details, level: 10 }, {}),
    ).toMatchObject({ category: 'basic', details: {} });
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

  it('пишет категорию в колонку, активацию и затраты — в extra', () => {
    const dto = {
      category: 'basic',
      details: {},
      activation: { kind: 'action' },
      costs,
    } as AbilityDto;
    expect(ABILITIES_CONFIG.toStored(dto)).toEqual({
      category: 'basic',
      details: {},
      extra: { activation: { kind: 'action' }, costs, steps: [] },
    });
  });

  // «Огненный снаряд»: испорченный шаг обрывает цепочку на себе.
  it('читает шаги до испорченного, без поля — пустой список', () => {
    const bolt = {
      when: 'always',
      times: 1,
      target: { kind: 'range', feet: 120, longFeet: null },
      check: {
        kind: 'attack',
        attack: 'ranged_spell',
        bonus: { kind: 'ability', ability: 'spellcasting' },
      },
      hit: {
        damage: [{ count: 1, die: 10, number: 0, type: 'fire' }],
        addModifier: false,
      },
      miss: { damage: 'none' },
    };
    expect(
      toAbilityVariant('basic', {}, { steps: [bolt, { target: 1 }, bolt] })
        .steps,
    ).toEqual([bolt]);
    expect(toAbilityVariant('basic', {}, {}).steps).toEqual([]);
  });
});
