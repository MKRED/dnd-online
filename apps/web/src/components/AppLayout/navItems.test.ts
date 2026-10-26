import { describe, expect, it } from 'vitest';
import { isNavActive } from './navItems';

describe('isNavActive', () => {
  it('раздел подсвечен и на вложенных страницах', () => {
    expect(isNavActive('/characters/1/edit', '/characters')).toBe(true);
    expect(isNavActive('/charactersx', '/characters')).toBe(false);
  });

  it('«Главная» подсвечена только на самой главной', () => {
    expect(isNavActive('/', '/')).toBe(true);
    expect(isNavActive('/games', '/')).toBe(false);
  });
});
