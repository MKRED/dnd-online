import { afterEach, describe, expect, it } from 'vitest';
import {
  readRecentBlocks,
  RECENT_LIMIT,
  saveRecentBlocks,
  withRecent,
} from './recentBlocks';

afterEach(() => localStorage.clear());

describe('withRecent', () => {
  it('выбранный — первым, без повтора', () => {
    expect(withRecent(['stone', 'wood', 'brick'], 'wood')).toEqual([
      'wood',
      'stone',
      'brick',
    ]);
  });

  it('не длиннее предела', () => {
    const many = Array.from({ length: RECENT_LIMIT }, (_, i) => `b${i}`);
    expect(withRecent(many, 'stone')).toHaveLength(RECENT_LIMIT);
  });
});

describe('readRecentBlocks', () => {
  it('читает сохранённое и отбрасывает неизвестные блоки', () => {
    saveRecentBlocks(['wood', 'no_such_block', 'stone_slab']);
    expect(readRecentBlocks()).toEqual(['wood', 'stone_slab']);
  });

  it('мусор в хранилище — пусто', () => {
    localStorage.setItem('maps.recentBlocks', '{oops');
    expect(readRecentBlocks()).toEqual([]);
  });
});
