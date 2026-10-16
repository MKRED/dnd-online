import { describe, expect, it } from 'vitest';
import type { EffectComponent } from './effectComponents.js';
import type { SpeedDetails } from './effectSpeed.js';
import { totalSpeed, type AppliedEffect } from './effectSpeedTotal.js';

const speed = (
  change: SpeedDetails['change'],
  feet: number | null = null,
  hover = false,
): EffectComponent => ({ kind: 'speed', change, feet, hover });

const longstrider: AppliedEffect = {
  source: 'longstrider',
  components: [speed('faster', 10)],
};
const rayOfFrost: AppliedEffect = {
  source: 'ray-of-frost',
  components: [speed('slower', 10)],
};
const haste: AppliedEffect = {
  source: 'haste',
  components: [
    speed('double'),
    {
      kind: 'advantage',
      mode: 'advantage',
      roll: 'save',
      ability: 'dexterity',
    },
  ],
};
const slow: AppliedEffect = { source: 'slow', components: [speed('half')] };
const stun: AppliedEffect = { source: 'stun', components: [speed('zero')] };
const fly: AppliedEffect = {
  source: 'fly',
  components: [speed('fly', 60, true)],
};
const spiderClimb: AppliedEffect = {
  source: 'spider-climb',
  components: [speed('climb')],
};

const walk = (base: number, effects: AppliedEffect[]) =>
  totalSpeed({ speed: base }, effects).speed;

describe('totalSpeed', () => {
  it('без эффектов — база', () => {
    expect(
      totalSpeed({ speed: 30, special: { swim: 30 }, hover: false }, []),
    ).toEqual({ speed: 30, special: { swim: 30 }, hover: false });
  });

  it('±N складываются, другие составляющие не мешают', () => {
    expect(walk(30, [longstrider])).toBe(40);
    expect(walk(30, [longstrider, rayOfFrost])).toBe(30);
    expect(walk(30, [haste])).toBe(60);
  });

  it('одно заклинание дважды не складывается, разные — складываются', () => {
    expect(walk(30, [longstrider, longstrider])).toBe(40);
    const other = { ...longstrider, source: 'boots' };
    expect(walk(30, [longstrider, other])).toBe(50);
  });

  it('сначала ±N, потом ×2 — в любом порядке эффектов', () => {
    expect(walk(30, [haste, longstrider])).toBe(80);
    expect(walk(30, [longstrider, haste])).toBe(80);
  });

  it('±N не уводит ниже 0 до умножения', () => {
    expect(walk(5, [rayOfFrost, haste])).toBe(0);
  });

  it('вдвое меньше округляет вниз, ×2 и ×½ гасят друг друга без потерь', () => {
    expect(walk(25, [slow])).toBe(12);
    expect(walk(25, [slow, haste])).toBe(25);
    expect(walk(25, [haste, slow])).toBe(25);
  });

  it('«0» — последним: ничто не поднимает Скорость, обнуляет и особые', () => {
    expect(
      totalSpeed({ speed: 30, special: { fly: 30 }, hover: true }, [
        stun,
        longstrider,
        haste,
        fly,
        spiderClimb,
      ]),
    ).toEqual({ speed: 0, special: { fly: 0, climb: 0 }, hover: true });
  });

  it('особая скорость с числом меняется той же операцией', () => {
    expect(totalSpeed({ speed: 30 }, [fly, haste]).special).toEqual({
      fly: 120,
    });
    expect(totalSpeed({ speed: 30 }, [fly, longstrider, slow]).special).toEqual(
      { fly: 35 },
    );
    expect(
      totalSpeed({ speed: 30, special: { swim: 40 } }, [rayOfFrost]).special,
    ).toEqual({ swim: 30 });
  });

  it('«равна Скорости» берётся от итога', () => {
    expect(totalSpeed({ speed: 30 }, [spiderClimb, longstrider])).toEqual({
      speed: 40,
      special: { climb: 40 },
      hover: false,
    });
    expect(totalSpeed({ speed: 25 }, [spiderClimb, slow]).special).toEqual({
      climb: 12,
    });
  });

  it('одна особая скорость из нескольких источников — наибольшая', () => {
    expect(
      totalSpeed({ speed: 30, special: { fly: 30 }, hover: false }, [fly]),
    ).toEqual({ speed: 30, special: { fly: 60 }, hover: true });
    expect(
      totalSpeed({ speed: 30, special: { climb: 50 } }, [spiderClimb]).special,
    ).toEqual({ climb: 50 });
  });

  it('парение — только с полётом', () => {
    expect(totalSpeed({ speed: 30, hover: true }, []).hover).toBe(false);
    expect(
      totalSpeed({ speed: 30, special: { fly: 30 }, hover: true }, []).hover,
    ).toBe(true);
  });
});
