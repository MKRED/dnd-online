import { describe, expect, it } from 'vitest';
import type { GameListItem } from 'shared';
import {
  greeting,
  homeGameStatus,
  joinableGames,
  myGames,
  runningGames,
  sessionDuration,
  summaryLine,
} from './homeSummary';

const base: GameListItem = {
  id: 'g',
  name: 'Игра',
  master: { id: 'm', nickname: 'Мастер' },
  seatCount: 4,
  takenSeats: 2,
  hasPassword: false,
  role: null,
  sessionStartedAt: null,
  createdAt: '2026-10-20T00:00:00.000Z',
};
const game = (patch: Partial<GameListItem>) => ({ ...base, ...patch });

describe('homeSummary', () => {
  it('состояние игры: встреча, лобби со свободными местами, встречи нет', () => {
    expect(
      homeGameStatus(game({ sessionStartedAt: '2026-10-20T10:00:00Z' })),
    ).toBe('session');
    expect(homeGameStatus(game({}))).toBe('lobby');
    expect(homeGameStatus(game({ takenSeats: 4 }))).toBe('idle');
  });

  it('свои игры — мастер и игрок, участник лобби — нет', () => {
    const list = [
      game({ id: 'a', role: 'master' }),
      game({ id: 'b', role: 'player' }),
      game({ id: 'c', role: 'member' }),
      game({ id: 'd' }),
    ];
    expect(myGames(list).map((g) => g.id)).toEqual(['a', 'b']);
  });

  it('идущие встречи — только свои, свежие сверху', () => {
    const list = [
      game({
        id: 'old',
        role: 'player',
        sessionStartedAt: '2026-10-20T08:00:00Z',
      }),
      game({ id: 'other', sessionStartedAt: '2026-10-20T11:00:00Z' }),
      game({
        id: 'new',
        role: 'master',
        sessionStartedAt: '2026-10-20T10:00:00Z',
      }),
    ];
    expect(runningGames(list).map((g) => g.id)).toEqual(['new', 'old']);
  });

  it('«Можно сесть» — чужие, без пароля, со свободным местом', () => {
    const list = [
      game({ id: 'ok' }),
      game({ id: 'member', role: 'member' }),
      game({ id: 'mine', role: 'master' }),
      game({ id: 'locked', hasPassword: true }),
      game({ id: 'full', takenSeats: 4 }),
    ];
    expect(joinableGames(list).map((g) => g.id)).toEqual(['ok', 'member']);
  });

  it('приветствие по часу', () => {
    expect(greeting(new Date(2026, 9, 20, 7))).toBe('Доброе утро');
    expect(greeting(new Date(2026, 9, 20, 13))).toBe('Добрый день');
    expect(greeting(new Date(2026, 9, 20, 19))).toBe('Добрый вечер');
    expect(greeting(new Date(2026, 9, 20, 2))).toBe('Доброй ночи');
  });

  it('длительность встречи в часах и минутах', () => {
    const now = new Date('2026-10-20T11:20:00Z');
    expect(sessionDuration('2026-10-20T10:00:00Z', now)).toBe('1 ч 20 мин');
    expect(sessionDuration('2026-10-20T11:05:00Z', now)).toBe('15 мин');
  });

  it('строка под приветствием', () => {
    const running = game({
      role: 'master',
      name: 'Пепел',
      sessionStartedAt: '2026-10-20T10:00:00Z',
    });
    expect(summaryLine([running])).toBe('Идёт встреча в «Пепел».');
    expect(summaryLine([running, { ...running, id: 'x' }])).toBe(
      'Идут встречи: 2.',
    );
    expect(summaryLine([game({ role: 'player' })])).toBe('Сейчас встреч нет.');
    expect(summaryLine([])).toMatch(/Своих игр пока нет/);
  });
});
