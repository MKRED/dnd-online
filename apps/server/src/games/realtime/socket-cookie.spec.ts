import { describe, expect, it } from 'vitest';
import { readCookie } from './socket-cookie.js';

describe('readCookie', () => {
  it('находит cookie по имени среди других', () => {
    const header = 'theme=dark; access_token=abc.def; refresh_token=xyz';
    expect(readCookie(header, 'access_token')).toBe('abc.def');
    expect(readCookie(header, 'refresh_token')).toBe('xyz');
  });

  it('раскодирует значение и не путает похожие имена', () => {
    expect(
      readCookie('my_access_token=1; access_token=a%20b', 'access_token'),
    ).toBe('a b');
  });

  it('без заголовка, без cookie или с битым значением — undefined', () => {
    expect(readCookie(undefined, 'access_token')).toBeUndefined();
    expect(readCookie('theme=dark', 'access_token')).toBeUndefined();
    expect(readCookie('access_token=%E0%A4%A', 'access_token')).toBeUndefined();
  });
});
