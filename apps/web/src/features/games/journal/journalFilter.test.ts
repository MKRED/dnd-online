import { describe, expect, it } from 'vitest';
import type { GameEvent } from 'shared';
import { filterJournal } from './journalFilter';

const base = {
  actor: null,
  as: { kind: 'master' as const },
  sceneId: 's1',
  createdAt: '2026-10-25T19:34:00.000Z',
};
const scene = { id: 's1', name: 'Подвал' };
const round = (seq: number, n: number): GameEvent => ({
  ...base,
  seq,
  kind: 'figures.round',
  visibility: 'players',
  intent: null,
  result: { scene, count: 1, round: n },
});
const dash = (seq: number, visibility: 'master' | 'players'): GameEvent => ({
  ...base,
  seq,
  kind: 'figure.dashed',
  visibility,
  intent: { characterId: 'c1' },
  result: { character: { id: 'c1', name: 'Алиса' }, dashes: 1 },
});
const edit = (seq: number): GameEvent => ({
  ...base,
  seq,
  kind: 'scene.edited',
  visibility: 'master',
  intent: { ops: [] },
  result: { scene, sceneSeq: 1, cells: 1, objects: 0, libraryCopied: 0 },
});

// Новые сверху, как в журнале.
const events = [
  round(6, 3),
  dash(5, 'players'),
  round(4, 2),
  edit(3),
  round(2, 1),
  dash(1, 'master'),
];
const seqs = (list: GameEvent[]) => list.map((event) => event.seq);

describe('filterJournal', () => {
  it('без фильтра — всё, и разделители подряд тоже', () => {
    const all = { filter: 'all' as const, players: false, rounds: true };
    expect(seqs(filterJournal(events, all))).toEqual([6, 5, 4, 3, 2, 1]);
  });

  it('по группе: разделитель — под записью его раунда или самый верхний', () => {
    expect(
      seqs(
        filterJournal(events, {
          filter: 'scene',
          players: false,
          rounds: true,
        }),
      ),
    ).toEqual([6, 3, 2]);
  });

  it('глазами игроков — без записей мастера', () => {
    expect(
      seqs(
        filterJournal(events, { filter: 'all', players: true, rounds: true }),
      ),
    ).toEqual([6, 5, 4]);
    // Без разделителей раунды — обычные записи группы «Перемещение».
    expect(
      seqs(
        filterJournal(events, {
          filter: 'combat',
          players: false,
          rounds: false,
        }),
      ),
    ).toEqual([]);
  });
});
