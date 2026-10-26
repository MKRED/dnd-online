import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SearchResult } from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import SearchPage from './SearchPage';

const ability = (id: string, name: string, mine: boolean) => ({
  id,
  name,
  category: 'basic' as const,
  spellLevel: null,
  mine,
  authorNickname: 'Аня',
});

const ALL: SearchResult = {
  groups: [
    {
      kind: 'ability',
      total: 12,
      hits: [ability('a1', 'Огненный шар', false)],
    },
    { kind: 'monster', total: 0, hits: [] },
    {
      kind: 'map',
      total: 1,
      hits: [{ id: 'm1', name: 'Огненные пещеры', width: 32, depth: 32 }],
    },
  ],
};
const ABILITIES: SearchResult = {
  groups: [
    {
      kind: 'ability',
      total: 12,
      hits: [
        ability('a1', 'Огненный шар', false),
        ability('a2', 'Огненная стрела', true),
      ],
    },
  ],
};

function setup(route: string) {
  const fetchMock = vi.fn((url: string) =>
    Promise.resolve(
      new Response(
        JSON.stringify(url.includes('kind=ability') ? ABILITIES : ALL),
        { status: 200 },
      ),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  renderWithProviders(<SearchPage />, { route });
  return fetchMock;
}

describe('SearchPage', () => {
  it('чипы с числами и записи группами; «Все 12» — на один раздел', async () => {
    setup('/search?q=огн');
    const abilities = await screen.findByRole('region', {
      name: 'Способности',
    });
    expect(screen.getByText(/13 результатов в 2 разделах/)).toBeInTheDocument();
    const chips = within(screen.getByRole('group', { name: 'Разделы' }));
    expect(chips.getByLabelText(/Все/)).toBeChecked();
    // Пустой раздел без чипа.
    expect(chips.queryByLabelText(/Монстры/)).not.toBeInTheDocument();
    expect(
      within(abilities).getByRole('link', { name: /Огненный шар/ }),
    ).toHaveAttribute('href', '/abilities/a1');
    expect(within(abilities).getByText('автор Аня')).toBeInTheDocument();
    expect(
      within(abilities).getByRole('link', { name: 'Все 12' }),
    ).toHaveAttribute('href', '/search?q=%D0%BE%D0%B3%D0%BD&kind=ability');
    // Карты — свои всегда, подписи автора нет.
    const maps = screen.getByRole('region', { name: 'Карты' });
    expect(within(maps).getByText('32×32')).toBeInTheDocument();
  });

  it('чип раздела показывает его записи, до 50', async () => {
    const fetchMock = setup('/search?q=огн');
    const chips = within(await screen.findByRole('group', { name: 'Разделы' }));
    await userEvent.click(chips.getByLabelText(/Способности/));
    expect(await screen.findByText('Моё')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('kind=ability&limit=50'),
      expect.anything(),
    );
    expect(
      screen.queryByRole('region', { name: 'Карты' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Показаны первые 2 — уточните запрос.'),
    ).toBeInTheDocument();
  });

  it('короткий запрос — подсказка вместо поиска', () => {
    const fetchMock = setup('/search?q=о');
    expect(screen.getByText(/Наберите хотя бы две буквы/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
