import { describe, expect, it } from 'vitest';
import { memberSince } from './memberSince';

describe('memberSince', () => {
  it('месяц в родительном падеже и год', () => {
    expect(memberSince('2026-09-14T10:00:00.000Z')).toBe('с сентября 2026');
    expect(memberSince('2026-05-20T10:00:00.000Z')).toBe('с мая 2026');
  });
});
