import { describe, expect, it } from 'vitest';
import { canBePrepared } from './characterAbilities.js';

describe('canBePrepared', () => {
  it('только заклинание 1 круга и выше', () => {
    expect(canBePrepared({ category: 'spell', level: 1 })).toBe(true);
    expect(canBePrepared({ category: 'spell', level: 9 })).toBe(true);
    expect(canBePrepared({ category: 'spell', level: 0 })).toBe(false);
    expect(canBePrepared({ category: 'basic', level: null })).toBe(false);
  });
});
