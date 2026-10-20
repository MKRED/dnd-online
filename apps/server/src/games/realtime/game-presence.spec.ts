import { describe, expect, it } from 'vitest';
import { GamePresence } from './game-presence.js';

describe('GamePresence', () => {
  it('пользователь в сети, пока открыта хоть одна его вкладка', () => {
    const presence = new GamePresence();
    expect(presence.add('g1', 'u1', 's1')).toBe(true);
    expect(presence.add('g1', 'u1', 's2')).toBe(false);
    expect(presence.add('g1', 'u2', 's3')).toBe(true);
    expect(presence.online('g1')).toEqual(['u1', 'u2']);

    expect(presence.remove('g1', 'u1', 's1')).toBe(false);
    expect(presence.online('g1')).toEqual(['u1', 'u2']);
    expect(presence.remove('g1', 'u1', 's2')).toBe(true);
    expect(presence.online('g1')).toEqual(['u2']);
  });

  it('игры не смешиваются, чужой сокет ничего не меняет', () => {
    const presence = new GamePresence();
    presence.add('g1', 'u1', 's1');
    presence.add('g2', 'u1', 's2');
    expect(presence.remove('g1', 'u1', 's2')).toBe(false);
    expect(presence.remove('g3', 'u1', 's1')).toBe(false);
    expect(presence.online('g1')).toEqual(['u1']);
    presence.forget('g1');
    expect(presence.online('g1')).toEqual([]);
    expect(presence.online('g2')).toEqual(['u1']);
  });
});
