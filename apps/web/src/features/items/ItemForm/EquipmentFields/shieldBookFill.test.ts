import { describe, expect, it } from 'vitest';
import { shieldBookFill } from './shieldBookFill';

describe('shieldBookFill', () => {
  it('в пустую форму подставляет щит книги', () => {
    expect(shieldBookFill({ name: '', weight: 0, costAmount: '' })).toEqual({
      name: 'Щит',
      weight: 6,
      costAmount: 10,
      costCoin: 'gp',
    });
  });

  it('введённое руками не трогает', () => {
    expect(
      shieldBookFill({ name: 'Щит стража', weight: 8, costAmount: 50 }),
    ).toEqual({});
  });
});
