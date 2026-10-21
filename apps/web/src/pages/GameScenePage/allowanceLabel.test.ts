import { describe, expect, it } from 'vitest';
import { allowanceLabel } from './allowanceLabel';

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
