import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './returnPath.js';

describe('safeReturnPath', () => {
  it.each([
    '/characters/11111111-1111-4111-8111-111111111111',
    '/items?tab=catalog&cat=food',
    '/',
  ])('keeps the site path %s', (path) => {
    expect(safeReturnPath(path)).toBe(path);
  });

  it.each([
    ['another site without a scheme', '//evil.example/x'],
    ['a backslash', '/\\evil.example'],
    ['a full address', 'https://evil.example'],
    ['a relative path', 'characters'],
    ['a control character', '/\tevil'],
    ['the login page', '/login?next=/x'],
    ['the register page', '/register'],
    ['not a string', 42],
    ['an empty value', ''],
  ])('rejects %s', (_, value) => {
    expect(safeReturnPath(value)).toBeNull();
  });

  it('keeps a path that only starts like the login page', () => {
    expect(safeReturnPath('/login-help')).toBe('/login-help');
  });
});
