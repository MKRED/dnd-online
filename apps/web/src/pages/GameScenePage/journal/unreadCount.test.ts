import { describe, expect, it } from 'vitest';
import type { GameEvent } from 'shared';
import { unreadCount } from './unreadCount';

function event(seq: number, actorId: string | null): GameEvent {
  return {
    seq,
    kind: 'member.entered',
    actor: actorId ? { id: actorId, nickname: actorId } : null,
    as: null,
    sceneId: null,
    createdAt: '2026-10-24T16:00:00Z',
    intent: null,
    result: null,
  } as unknown as GameEvent;
}

describe('unreadCount', () => {
  it('считает записи других после увиденной', () => {
    const live = [
      event(1, 'p1'),
      event(2, 'gm'),
      event(3, 'p1'),
      event(4, null),
    ];
    expect(unreadCount(live, 0, 'gm')).toBe(3);
    expect(unreadCount(live, 3, 'gm')).toBe(1);
    expect(unreadCount(live, 4, 'gm')).toBe(0);
  });

  it('свои записи мастера не считаются', () => {
    expect(unreadCount([event(5, 'gm')], 0, 'gm')).toBe(0);
  });
});
