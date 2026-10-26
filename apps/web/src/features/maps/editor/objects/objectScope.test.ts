import { describe, expect, it } from 'vitest';
import type { MapObject } from 'shared';
import type { ObjectChoice } from './objectPlacement';
import { choiceInScope, objectInScope, recentInScope } from './objectScope';

const object = (kind: string) =>
  ({ id: 1, kind, at: [0, 0, 0] }) as unknown as MapObject;
const entry = {
  kind: 'monster',
  id: 'm',
  name: 'Крыса',
  label: 'Крыса',
} as const;
const rat: ObjectChoice = { kind: 'creature', entry };
const chest: ObjectChoice = { kind: 'container', look: 'chest' };

describe('objectScope', () => {
  it('«Существа» берут монстров и НПС, «Строить» на сцене — всё остальное', () => {
    for (const kind of ['monster', 'npc']) {
      expect(objectInScope('creatures', object(kind))).toBe(true);
      expect(objectInScope('things', object(kind))).toBe(false);
    }
    for (const kind of ['furniture', 'container', 'item', 'start']) {
      expect(objectInScope('creatures', object(kind))).toBe(false);
      expect(objectInScope('things', object(kind))).toBe(true);
    }
    expect(objectInScope('all', object('monster'))).toBe(true);
  });

  it('выбор и недавние делятся так же, блоки — не у «Существ»', () => {
    expect(choiceInScope('creatures', rat)).toBe(true);
    expect(choiceInScope('things', rat)).toBe(false);
    expect(choiceInScope('things', chest)).toBe(true);
    expect(recentInScope('creatures', { type: 'block', name: 'stone' })).toBe(
      false,
    );
    expect(recentInScope('things', { type: 'block', name: 'stone' })).toBe(
      true,
    );
    expect(recentInScope('creatures', { type: 'object', choice: rat })).toBe(
      true,
    );
    expect(recentInScope('all', { type: 'object', choice: rat })).toBe(true);
  });
});
