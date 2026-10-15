import { describe, expect, it } from 'vitest';
import {
  isAbilityActivation,
  isAbilityCosts,
  NO_ABILITY_COSTS,
  type AbilityCosts,
} from './abilityUsage.js';
import { formatActivation, formatCosts } from './abilityUsageLabels.js';

describe('isAbilityActivation', () => {
  it('принимает каждый вид', () => {
    expect(isAbilityActivation({ kind: 'action' })).toBe(true);
    expect(isAbilityActivation({ kind: 'bonus_action' })).toBe(true);
    expect(isAbilityActivation({ kind: 'attack' })).toBe(true);
    expect(isAbilityActivation({ kind: 'reaction', trigger: '' })).toBe(true);
    expect(
      isAbilityActivation({ kind: 'free', trigger: 'когда выпадает 1' }),
    ).toBe(true);
    expect(
      isAbilityActivation({ kind: 'time', amount: 10, unit: 'minute' }),
    ).toBe(true);
  });

  it('отклоняет неверные поля', () => {
    expect(isAbilityActivation({ kind: 'reaction' })).toBe(false);
    expect(
      isAbilityActivation({ kind: 'reaction', trigger: 'я'.repeat(201) }),
    ).toBe(false);
    expect(isAbilityActivation({ kind: 'action', trigger: '' })).toBe(false);
    expect(
      isAbilityActivation({ kind: 'time', amount: 0, unit: 'minute' }),
    ).toBe(false);
    expect(
      isAbilityActivation({ kind: 'time', amount: 1, unit: 'round' }),
    ).toBe(false);
    expect(isAbilityActivation({ kind: 'magic' })).toBe(false);
  });
});

describe('isAbilityCosts', () => {
  const all: AbilityCosts = {
    uses: { count: { kind: 'ability', ability: 'charisma' }, recovery: 'long' },
    spellSlot: { minLevel: 3 },
    movement: { kind: 'feet', feet: 10 },
    hitDie: true,
  };

  it('принимает пустые и полные затраты', () => {
    expect(isAbilityCosts(NO_ABILITY_COSTS)).toBe(true);
    expect(isAbilityCosts(all)).toBe(true);
  });

  it('отклоняет неверные затраты', () => {
    expect(isAbilityCosts({ ...all, spellSlot: { minLevel: 10 } })).toBe(false);
    expect(isAbilityCosts({ ...all, movement: 'half' })).toBe(false);
    expect(
      isAbilityCosts({ ...all, movement: { kind: 'feet', feet: 12 } }),
    ).toBe(false);
    expect(
      isAbilityCosts({ ...all, movement: { kind: 'feet', feet: 125 } }),
    ).toBe(false);
    expect(isAbilityCosts({ ...all, movement: { kind: 'feet' } })).toBe(false);
    expect(
      isAbilityCosts({
        ...all,
        uses: { count: { kind: 'fixed', amount: 0 }, recovery: 'long' },
      }),
    ).toBe(false);
    expect(
      isAbilityCosts({
        ...all,
        uses: { count: { kind: 'proficiency' }, recovery: 'dawn' },
      }),
    ).toBe(false);
    expect(isAbilityCosts({ uses: null })).toBe(false);
  });
});

describe('формат', () => {
  it('пишет активацию с условием и временем', () => {
    expect(formatActivation({ kind: 'bonus_action' })).toBe(
      'Бонусное действие',
    );
    expect(
      formatActivation({ kind: 'reaction', trigger: 'когда вас бьют' }),
    ).toBe('Реакция, когда вас бьют');
    expect(formatActivation({ kind: 'free', trigger: '  ' })).toBe(
      'Без действия',
    );
    expect(formatActivation({ kind: 'time', amount: 10, unit: 'minute' })).toBe(
      '10 минут',
    );
  });

  it('пишет затраты по строке', () => {
    expect(formatCosts(NO_ABILITY_COSTS)).toEqual([]);
    expect(
      formatCosts({
        uses: { count: { kind: 'fixed', amount: 2 }, recovery: 'short_one' },
        spellSlot: { minLevel: 1 },
        movement: { kind: 'all' },
        hitDie: true,
      }),
    ).toEqual([
      '2 заряда — один после короткого отдыха, все после долгого',
      'Ячейка заклинаний',
      'Вся скорость',
      'Кость хитов',
    ]);
    expect(
      formatCosts({
        ...NO_ABILITY_COSTS,
        uses: { count: { kind: 'proficiency' }, recovery: 'long' },
        spellSlot: { minLevel: 3 },
        movement: { kind: 'feet', feet: 10 },
      }),
    ).toEqual([
      'Заряды: бонус мастерства — все после долгого отдыха',
      'Ячейка заклинаний 3 круга или выше',
      '10 фт. перемещения',
    ]);
  });
});
