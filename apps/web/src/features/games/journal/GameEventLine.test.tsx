import { screen } from '@testing-library/react';
import type { GameEvent } from 'shared';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import GameEventLine from './GameEventLine';

const base = {
  seq: 1,
  actor: { id: 'u1', nickname: 'MK RED' },
  as: { kind: 'master' as const },
  sceneId: 's1',
  createdAt: '2026-10-25T19:34:00.000Z',
};
const silas = { objectId: 2, name: 'Сайлас, Учёный Роя' };

const creatureHit: GameEvent = {
  ...base,
  kind: 'creature.changed',
  visibility: 'players',
  intent: {
    objectId: 2,
    change: {
      kind: 'damage',
      amount: 14,
      parts: [
        { amount: 6, type: 'piercing' },
        { amount: 8, type: 'necrotic' },
      ],
    },
  },
  result: {
    creature: silas,
    before: { current: 44, max: 65, temp: 0 },
    after: { current: 30, max: 65, temp: 0 },
  },
};

const state = (hp: number) => ({
  hitPointsCurrent: hp,
  hitPointsMax: 22,
  hitPointsTemp: 0,
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  spellSlots: {},
});

describe('GameEventLine', () => {
  it('урон по существу: части с типами и сумма, хиты мастеру, метка «Ранен»', () => {
    renderWithProviders(<GameEventLine event={creatureHit} view="master" />);
    expect(screen.getByText('Колющий')).toBeInTheDocument();
    expect(screen.getByText('Некротический')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('хиты 44 → 30')).toBeInTheDocument();
    expect(screen.getByText('Ранен')).toBeInTheDocument();
  });

  it('глазами игроков у существа нет хитов, метка остаётся', () => {
    renderWithProviders(<GameEventLine event={creatureHit} view="players" />);
    expect(screen.queryByText(/хиты/)).toBeNull();
    expect(screen.getByText('Ранен')).toBeInTheDocument();
    expect(screen.getByText('Некротический')).toBeInTheDocument();
  });

  it('персонаж партии и глазами игроков — с хитами; старая запись — одна часть без типа', () => {
    const event: GameEvent = {
      ...base,
      kind: 'character.changed',
      visibility: 'players',
      intent: { characterId: 'c1', change: { kind: 'damage', amount: 10 } },
      result: {
        character: { id: 'c1', name: 'Хасе Гансалес' },
        before: state(22),
        after: state(12),
        instantDeath: false,
      },
    };
    renderWithProviders(<GameEventLine event={event} view="players" />);
    expect(screen.getByText('хиты 22 → 12')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('ход существа глазами игроков — без запаса движения', () => {
    const event = {
      ...base,
      kind: 'creature.moved',
      visibility: 'players',
      intent: { objectId: 3, to: [1, 1, 4] },
      result: {
        scene: { id: 's1', name: 'Подвал' },
        sceneSeq: 3,
        cells: 0,
        objects: 1,
        creature: { objectId: 3, name: 'Серафина' },
        from: [1, 1, 0],
        to: [1, 1, 4],
        cost: 10,
        left: 20,
      },
    } as GameEvent;
    const { unmount } = renderWithProviders(
      <GameEventLine event={event} view="players" />,
    );
    expect(screen.getByText('Ход: Серафина')).toBeInTheDocument();
    unmount();
    renderWithProviders(<GameEventLine event={event} view="master" />);
    expect(
      screen.getByText('Ход: Серафина — 10 фт, осталось 20 фт'),
    ).toBeInTheDocument();
  });
});
