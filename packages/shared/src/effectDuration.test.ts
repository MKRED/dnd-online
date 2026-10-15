import { describe, expect, it } from 'vitest';
import { isEffectDuration } from './effectDuration.js';
import {
  durationUnitLabel,
  formatEffectDuration,
  formatEffectDurationShort,
} from './effectDurationLabels.js';

describe('isEffectDuration', () => {
  it('принимает все виды длительности', () => {
    expect(isEffectDuration({ kind: 'permanent' })).toBe(true);
    expect(
      isEffectDuration({
        kind: 'time',
        amount: 10,
        unit: 'minute',
        concentration: true,
      }),
    ).toBe(true);
    expect(
      isEffectDuration({ kind: 'turn', edge: 'end', owner: 'bearer' }),
    ).toBe(true);
    expect(isEffectDuration({ kind: 'rest', rest: 'long' })).toBe(true);
  });

  it('отклоняет неверное время', () => {
    const time = { kind: 'time', unit: 'round', concentration: false };
    expect(isEffectDuration({ ...time, amount: 0 })).toBe(false);
    expect(isEffectDuration({ ...time, amount: 1.5 })).toBe(false);
    expect(isEffectDuration({ ...time, amount: 1000 })).toBe(false);
    expect(isEffectDuration({ ...time, amount: '2' })).toBe(false);
    expect(isEffectDuration({ ...time, amount: 2, unit: 'week' })).toBe(false);
    expect(isEffectDuration({ kind: 'time', amount: 2, unit: 'round' })).toBe(
      false,
    );
  });

  it('отклоняет чужие поля и неизвестные виды', () => {
    expect(isEffectDuration({ kind: 'permanent', amount: 1 })).toBe(false);
    expect(
      isEffectDuration({ kind: 'turn', edge: 'start', owner: 'ally' }),
    ).toBe(false);
    expect(isEffectDuration({ kind: 'instant' })).toBe(false);
    expect(isEffectDuration(null)).toBe(false);
    expect(isEffectDuration('permanent')).toBe(false);
  });
});

describe('formatEffectDuration', () => {
  it('согласует единицу с числом', () => {
    const time = (amount: number, unit: 'round' | 'minute' | 'hour' | 'day') =>
      formatEffectDuration({
        kind: 'time',
        amount,
        unit,
        concentration: false,
      });
    expect(time(1, 'round')).toBe('1 раунд');
    expect(time(3, 'minute')).toBe('3 минуты');
    expect(time(11, 'hour')).toBe('11 часов');
    expect(time(21, 'day')).toBe('21 день');
    expect(durationUnitLabel('minute', 12)).toBe('минут');
  });

  it('пишет концентрацию с «вплоть до»', () => {
    const conc = (amount: number) =>
      formatEffectDuration({
        kind: 'time',
        amount,
        unit: 'minute',
        concentration: true,
      });
    expect(conc(1)).toBe('Концентрация, вплоть до 1 минуты');
    expect(conc(10)).toBe('Концентрация, вплоть до 10 минут');
  });

  it('пишет ход и отдых полностью и коротко', () => {
    const turn = { kind: 'turn', edge: 'start', owner: 'creator' } as const;
    expect(formatEffectDuration(turn)).toBe(
      'До начала следующего хода наложившего',
    );
    expect(
      formatEffectDuration({ kind: 'turn', edge: 'end', owner: 'bearer' }),
    ).toBe('До конца своего следующего хода');
    expect(formatEffectDurationShort(turn)).toBe('До начала хода');
    expect(formatEffectDuration({ kind: 'rest', rest: 'short' })).toBe(
      'До короткого или длинного отдыха',
    );
    expect(formatEffectDurationShort({ kind: 'rest', rest: 'short' })).toBe(
      'До отдыха',
    );
    expect(formatEffectDurationShort({ kind: 'permanent' })).toBe('Бессрочно');
  });
});
