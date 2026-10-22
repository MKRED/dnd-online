import { describe, expect, it } from 'vitest';
import { fractionToLevel, levelToFraction, tickLevels } from './cutTrack';

describe('cutTrack', () => {
  it('уровень и доля высоты переводятся туда и обратно', () => {
    expect(levelToFraction(3, 1, 5)).toBe(0.5);
    expect(fractionToLevel(0.5, 1, 5)).toBe(3);
  });

  it('доля за пределами дорожки прижимается к краям', () => {
    expect(fractionToLevel(-0.3, 1, 5)).toBe(1);
    expect(fractionToLevel(1.7, 1, 5)).toBe(5);
  });

  it('засечки — каждый уровень на низкой карте и каждый пятый на высокой', () => {
    expect(tickLevels(0, 3)).toEqual([0, 1, 2, 3]);
    expect(tickLevels(2, 40)).toEqual([5, 10, 15, 20, 25, 30, 35, 40]);
  });
});
