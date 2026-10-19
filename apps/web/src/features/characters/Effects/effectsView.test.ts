import { describe, expect, it } from 'vitest';
import { effectEntryHint } from './effectsView';

describe('effectEntryHint', () => {
  it('называет того, на ком эффект', () => {
    const deleted = { id: 'x', effect: null, missing: 'deleted' } as const;
    expect(effectEntryHint(deleted, 'character')).toBe(
      'Не действует на персонажа. Плашку можно только снять',
    );
    expect(effectEntryHint(deleted, 'monster')).toBe(
      'Не действует на монстра. Плашку можно только снять',
    );
  });
});
