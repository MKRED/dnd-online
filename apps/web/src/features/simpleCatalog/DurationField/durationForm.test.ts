import { describe, expect, it } from 'vitest';
import {
  fromDurationValues,
  toDurationValues,
  validateDurationAmount,
} from './durationForm';

describe('durationForm', () => {
  it('без длительности открывает форму на «Бессрочно»', () => {
    expect(toDurationValues().kind).toBe('permanent');
  });

  it('при смене вида не теряет введённое и отдаёт только поля вида', () => {
    const values = toDurationValues({
      kind: 'time',
      amount: 10,
      unit: 'minute',
      concentration: true,
    });
    const asTurn = { ...values, kind: 'turn' as const };
    expect(fromDurationValues(asTurn)).toEqual({
      kind: 'turn',
      edge: 'start',
      owner: 'creator',
    });
    expect(fromDurationValues({ ...asTurn, kind: 'time' })).toEqual({
      kind: 'time',
      amount: 10,
      unit: 'minute',
      concentration: true,
    });
  });

  it('проверяет число только у времени', () => {
    const time = {
      duration: toDurationValues({
        kind: 'time',
        amount: 1,
        unit: 'round',
        concentration: false,
      }),
    };
    expect(validateDurationAmount('', time)).toBe('От 1 до 999');
    expect(validateDurationAmount(0, time)).not.toBeNull();
    expect(validateDurationAmount(1000, time)).not.toBeNull();
    expect(validateDurationAmount(6, time)).toBeNull();
    const permanent = { duration: toDurationValues() };
    expect(validateDurationAmount('', permanent)).toBeNull();
  });
});
