import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameEvent, GameEventPage } from 'shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import GameJournalEntries from './GameJournalEntries';

const base = {
  actor: { id: 'u1', nickname: 'MK RED' },
  as: { kind: 'master' as const },
  sceneId: 's1',
  createdAt: '2026-10-25T19:34:00.000Z',
};
const scene = { id: 's1', name: 'Подвал' };

const events: GameEvent[] = [
  {
    ...base,
    seq: 3,
    kind: 'scene.edited',
    visibility: 'master',
    intent: { ops: [] },
    result: { scene, sceneSeq: 2, cells: 0, objects: 1, libraryCopied: 0 },
  },
  {
    ...base,
    seq: 2,
    kind: 'figure.dashed',
    visibility: 'players',
    intent: { characterId: 'c1' },
    result: { character: { id: 'c1', name: 'Алиса Фёдорова' }, dashes: 1 },
  },
  {
    ...base,
    seq: 1,
    kind: 'scene.opened',
    visibility: 'players',
    intent: null,
    result: { scene },
  },
];

afterEach(() => vi.unstubAllGlobals());

function setup() {
  const page: GameEventPage = { events, hasMore: false };
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(page), { status: 200 })),
    ),
  );
  renderWithProviders(<GameJournalEntries gameId="g1" live={[]} />);
}

describe('GameJournalEntries', () => {
  it('фильтр по группам и пустой итог', async () => {
    setup();
    expect(
      await screen.findByText(/Рывок: Алиса Фёдорова/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Сцена' }));
    expect(screen.queryByText(/Рывок/)).toBeNull();
    expect(screen.getByText(/Сцена изменена/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Эффекты' }));
    expect(
      screen.getByText('Среди загруженных записей таких нет'),
    ).toBeInTheDocument();
  });

  it('у мастера скрытое от игроков помечено; «Глазами игроков» его убирает', async () => {
    setup();
    await screen.findByText(/Сцена изменена/);
    expect(screen.getAllByText(/только мастеру/)).toHaveLength(1);
    await userEvent.click(
      screen.getByRole('switch', { name: /Глазами игроков/ }),
    );
    expect(screen.queryByText(/Сцена изменена/)).toBeNull();
    expect(screen.queryByText(/только мастеру/)).toBeNull();
    expect(screen.getByText(/Сцена открыта игрокам/)).toBeInTheDocument();
  });
});
