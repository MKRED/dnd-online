import { describe, expect, it } from 'vitest';
import {
  allowanceLabel,
  movementText,
  shortMovementText,
} from './allowanceLabel';

describe('allowanceLabel', () => {
  it('без лазания — только Скорость', () => {
    expect(
      allowanceLabel({ speed: 30, climb: null, moved: 10, dashes: 0 }),
    ).toBe('20 из 30 фт');
  });

  it('с лазанием пройденное вычитается из обеих, «Рывок» удваивает обе', () => {
    expect(allowanceLabel({ speed: 30, climb: 60, moved: 40, dashes: 1 })).toBe(
      '20 из 60 фт, лазание 80 из 120',
    );
  });
});

describe('movementText', () => {
  const m = { speed: 30, climb: null, moved: 10, dashes: 0 };

  it('в бою — сколько осталось', () => {
    expect(movementText(m, false)).toBe('осталось 20 из 30 фт');
    expect(shortMovementText(m, false)).toBe('20 / 30 фт');
  });

  it('вне боя — Скорость на каждый ход, с лазанием', () => {
    expect(movementText(m, true)).toBe('до 30 фт за ход');
    expect(movementText({ ...m, climb: 60 }, true)).toBe(
      'до 30 фт за ход, лазание до 60',
    );
    expect(shortMovementText(m, true)).toBe('30 фт/ход');
  });
});
