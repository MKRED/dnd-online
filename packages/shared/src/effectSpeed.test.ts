import { describe, expect, it } from 'vitest';
import {
  formatEffectComponent,
  isEffectComponents,
  type EffectComponent,
} from './effectComponents.js';
import {
  formatSpeed,
  isSpeedDetails,
  type SpeedDetails,
} from './effectSpeed.js';

const longstrider: SpeedDetails = { change: 'faster', feet: 10, hover: false };
const fly: SpeedDetails = { change: 'fly', feet: 60, hover: true };
const speed = (details: SpeedDetails): EffectComponent => ({
  kind: 'speed',
  ...details,
});

describe('effectSpeed', () => {
  it('принимает изменения Скорости и особые скорости из книги', () => {
    const good: SpeedDetails[] = [
      longstrider,
      { change: 'slower', feet: 10, hover: false },
      { change: 'double', feet: null, hover: false },
      { change: 'half', feet: null, hover: false },
      { change: 'zero', feet: null, hover: false },
      fly,
      { change: 'climb', feet: null, hover: false },
      { change: 'burrow', feet: 300, hover: false },
    ];
    for (const value of good) expect(isSpeedDetails(value)).toBe(true);
  });

  it('футы — кратно 5, до 300; парение — только у полёта', () => {
    const bad = [
      { ...longstrider, feet: null },
      { ...longstrider, feet: 0 },
      { ...longstrider, feet: 12 },
      { ...longstrider, feet: 305 },
      { ...longstrider, feet: -10 },
      { change: 'double', feet: 10, hover: false },
      { change: 'swim', feet: null, hover: true },
      { ...longstrider, hover: true },
      { ...longstrider, change: 'teleport' },
      { change: 'faster', feet: 10 },
      { ...longstrider, hover: 'yes' },
      null,
    ];
    for (const value of bad) expect(isSpeedDetails(value)).toBe(false);
  });

  it('одно изменение Скорости и каждая особая скорость — один раз', () => {
    expect(isEffectComponents([speed(longstrider), speed(fly)])).toBe(true);
    expect(
      isEffectComponents([
        speed(fly),
        speed({ change: 'climb', feet: null, hover: false }),
      ]),
    ).toBe(true);
    expect(
      isEffectComponents([
        speed(longstrider),
        speed({ change: 'double', feet: null, hover: false }),
      ]),
    ).toBe(false);
    expect(
      isEffectComponents([speed(fly), speed({ ...fly, feet: null })]),
    ).toBe(false);
  });

  it('строка карточки', () => {
    expect(formatSpeed(longstrider)).toBe('Скорость +10 фт.');
    expect(formatSpeed({ change: 'slower', feet: 10, hover: false })).toBe(
      'Скорость −10 фт.',
    );
    expect(formatSpeed({ change: 'zero', feet: null, hover: false })).toBe(
      'Скорость 0',
    );
    expect(formatEffectComponent(speed(fly))).toBe(
      'Скорость полёта 60 фт., может парить',
    );
    expect(formatSpeed({ change: 'climb', feet: null, hover: false })).toBe(
      'Скорость лазания, равная Скорости',
    );
  });
});
