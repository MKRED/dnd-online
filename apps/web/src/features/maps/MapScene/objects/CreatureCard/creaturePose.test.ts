import { describe, expect, it } from 'vitest';
import {
  coffinOutline,
  coffinSize,
  creaturePose,
  lyingScale,
} from './creaturePose';

describe('creaturePose', () => {
  it('монстр на нуле — гроб, персонаж на нуле лежит, погибший персонаж — гроб', () => {
    expect(creaturePose(null, false)).toBe('standing');
    expect(creaturePose('bloodied', true)).toBe('standing');
    expect(creaturePose('down', false)).toBe('coffin');
    expect(creaturePose('down', true)).toBe('lying');
    expect(creaturePose('dead', true)).toBe('coffin');
  });
});

describe('размеры лежащих', () => {
  it('лежащая карточка не выходит за своё место, короткую не растягивает', () => {
    expect(lyingScale(1.9, 1) * 1.9).toBeCloseTo(0.9);
    expect(lyingScale(0.5, 1)).toBe(1);
  });

  it('гроб помещается в место и вытянут по взгляду, изголовье уже плеч', () => {
    for (const footprint of [0.5, 1, 2, 3, 4]) {
      const size = coffinSize(footprint);
      const outline = coffinOutline(size);
      for (const [x, z] of outline) {
        expect(Math.abs(x)).toBeLessThanOrEqual(footprint / 2);
        expect(Math.abs(z)).toBeLessThanOrEqual(footprint / 2);
      }
      const head = Math.abs(outline[0][0] - outline[1][0]);
      const shoulders = Math.abs(outline[2][0] - outline[5][0]);
      expect(head).toBeLessThan(shoulders);
      expect(size.length).toBeGreaterThan(size.width);
    }
  });
});
