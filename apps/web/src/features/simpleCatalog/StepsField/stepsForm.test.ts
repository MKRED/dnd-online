import type { AbilityStep } from 'shared';
import { describe, expect, it } from 'vitest';
import {
  fromStepValues,
  newDamage,
  newStep,
  toStepValues,
  withAttack,
  withCheck,
  type StepValues,
} from './stepsForm';
import { stepsValidate } from './stepsValidate';

const longbow: AbilityStep = {
  target: { kind: 'range', feet: 150, longFeet: 600 },
  check: {
    kind: 'attack',
    attack: 'ranged_weapon',
    bonus: { kind: 'ability', ability: 'dexterity' },
  },
  hit: {
    damage: [{ count: 1, die: 8, number: 0, type: 'piercing' }],
    addModifier: true,
  },
  miss: { damage: 'none' },
};

const formOf = (step: StepValues) => ({ steps: [step] });

describe('stepsForm', () => {
  it('шаг читается в форму и уходит обратно таким же', () => {
    expect(fromStepValues(toStepValues(longbow))).toEqual(longbow);
  });

  it('скрытые поля не уходят: дальняя у заклинания, модификатор при числе, половина без урона', () => {
    const spell = { ...newStep(), longOn: true };
    expect(fromStepValues(spell).target).toEqual({
      kind: 'range',
      feet: 120,
      longFeet: null,
    });
    const fixed = {
      ...newStep(),
      bonusKind: 'fixed' as const,
      addModifier: true,
    };
    expect(fromStepValues(fixed)).toMatchObject({
      check: { bonus: { kind: 'fixed', value: 5 } },
      hit: { addModifier: false },
    });
    const empty = { ...newStep(), damage: [], onMiss: 'half' as const };
    expect(fromStepValues(empty).miss).toEqual({ damage: 'none' });
  });

  it('смена вида атаки подставляет цель и характеристику', () => {
    const sword = withAttack(newStep(), 'melee_weapon');
    expect(sword).toMatchObject({
      target: 'reach',
      bonusAbility: 'strength',
      addModifier: true,
    });
    // Касание подходит и атаке оружием — остаётся.
    const touch = {
      ...withAttack(newStep(), 'melee_spell'),
      target: 'touch' as const,
    };
    expect(withAttack(touch, 'melee_weapon').target).toBe('touch');
  });

  it('проверки: футы, дальняя дальше обычной, пустой урон', () => {
    const bow = { ...toStepValues(longbow), longFeet: 100 };
    expect(stepsValidate.rangeFeet(152, formOf(bow), 'steps.0.rangeFeet')).toBe(
      'Кратно 5, от 5 до 5280',
    );
    expect(stepsValidate.longFeet(100, formOf(bow), 'steps.0.longFeet')).toBe(
      'Дальше обычной',
    );
    // Досягаемость не проверяется, пока цель — дистанция.
    expect(
      stepsValidate.reachFeet('', formOf(bow), 'steps.0.reachFeet'),
    ).toBeNull();
    const blank = {
      ...newStep(),
      damage: [{ ...newDamage(), count: 0, number: 0 }],
    };
    expect(
      stepsValidate.damage.count(0, formOf(blank), 'steps.0.damage.0.count'),
    ).toBe('Укажите кости или число');
    expect(
      stepsValidate.bonusValue(40, formOf(blank), 'steps.0.bonusValue'),
    ).toBeNull();
    const fixed = { ...blank, bonusKind: 'fixed' as const };
    expect(
      stepsValidate.bonusValue(40, formOf(fixed), 'steps.0.bonusValue'),
    ).toBe('От -5 до 30');
  });
});

const fireball: AbilityStep = {
  target: {
    kind: 'area',
    area: { shape: 'sphere', radius: 20 },
    origin: { kind: 'point', feet: 150 },
  },
  check: {
    kind: 'save',
    ability: 'dexterity',
    dc: { kind: 'ability', ability: 'spellcasting' },
  },
  hit: {
    damage: [{ count: 8, die: 6, number: 0, type: 'fire' }],
    addModifier: false,
  },
  miss: { damage: 'half' },
};

describe('stepsForm: спасбросок, область, без проверки', () => {
  it('шаги этапа 4 читаются в форму и уходят обратно такими же', () => {
    const cylinder: AbilityStep = {
      ...fireball,
      target: {
        kind: 'area',
        area: { shape: 'cylinder', radius: 5, height: 40 },
        origin: { kind: 'self' },
      },
      check: { ...fireball.check, dc: { kind: 'fixed', value: 15 } },
    } as AbilityStep;
    const missile: AbilityStep = {
      target: { kind: 'self' },
      check: { kind: 'none' },
      hit: fireball.hit,
      miss: { damage: 'none' },
    };
    for (const step of [fireball, cylinder, missile]) {
      expect(fromStepValues(toStepValues(step))).toEqual(step);
    }
  });

  it('смена проверки подбирает цель и убирает модификатор', () => {
    const bow = toStepValues(longbow);
    const save = withCheck(bow, 'save');
    expect(save).toMatchObject({ target: 'range', addModifier: false });
    // «На себя» есть только без проверки: у спасброска цель сменится.
    const self = { ...withCheck(bow, 'none'), target: 'self' as const };
    expect(withCheck(self, 'save').target).toBe('touch');
    // Назад к атаке — цель и характеристика вида атаки.
    expect(withCheck(save, 'attack')).toMatchObject({
      target: 'range',
      bonusAbility: 'dexterity',
      addModifier: true,
    });
  });

  it('без проверки нет половины, эманация всегда от себя', () => {
    const none = { ...toStepValues(fireball), check: 'none' as const };
    expect(fromStepValues(none).miss).toEqual({ damage: 'none' });
    const aura = { ...toStepValues(fireball), areaShape: 'emanation' as const };
    expect(fromStepValues(aura).target).toEqual({
      kind: 'area',
      area: { shape: 'emanation', distance: 20 },
      origin: { kind: 'self' },
    });
  });

  it('проверки области и Сл — только видимых полей', () => {
    const step = toStepValues(fireball);
    expect(stepsValidate.areaSize(3, formOf(step), 'steps.0.areaSize')).toBe(
      'Кратно 5, от 5 до 1000',
    );
    // Высота — только у цилиндра.
    expect(
      stepsValidate.areaHeight('', formOf(step), 'steps.0.areaHeight'),
    ).toBeNull();
    expect(
      stepsValidate.areaHeight(
        '',
        formOf({ ...step, areaShape: 'cylinder' }),
        'steps.0.areaHeight',
      ),
    ).toBe('Кратно 5, от 5 до 1000');
    expect(
      stepsValidate.originFeet(0, formOf(step), 'steps.0.originFeet'),
    ).toBe('Кратно 5, от 5 до 5280');
    expect(
      stepsValidate.dcValue(0, formOf(step), 'steps.0.dcValue'),
    ).toBeNull();
    expect(
      stepsValidate.dcValue(
        0,
        formOf({ ...step, dcKind: 'fixed' }),
        'steps.0.dcValue',
      ),
    ).toBe('От 1 до 30');
  });
});
