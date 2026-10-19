import { describe, expect, it } from 'vitest';
import { characterKindQuery, readCharacterKind } from './characterKinds';

describe('readCharacterKind', () => {
  it('читает НПС, а без параметра и с чужим значением — игровые', () => {
    expect(readCharacterKind(new URLSearchParams('kind=npc'))).toBe('npc');
    expect(readCharacterKind(new URLSearchParams(''))).toBe('pc');
    expect(readCharacterKind(new URLSearchParams('kind=boss'))).toBe('pc');
  });
});

describe('characterKindQuery', () => {
  it('у игровых адрес без параметра', () => {
    expect(characterKindQuery('pc')).toBe('');
    expect(characterKindQuery('npc')).toBe('?kind=npc');
  });
});
