import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import type { SearchResult } from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import HeaderSearch from './HeaderSearch';

const catalog = { mine: true, authorNickname: 'Михаил' };
const RESULT: SearchResult = {
  groups: [
    {
      kind: 'ability',
      total: 6,
      hits: [
        {
          id: 'a1',
          name: 'Огненный шар',
          category: 'spell',
          spellLevel: 3,
          ...catalog,
        },
        {
          id: 'a2',
          name: 'Огненная стрела',
          category: 'spell',
          spellLevel: 0,
          ...catalog,
        },
      ],
    },
    { kind: 'monster', total: 0, hits: [] },
    {
      kind: 'character',
      total: 1,
      hits: [
        {
          id: 'c1',
          name: 'Ганс «Огнебород»',
          characterKind: 'npc',
          classes: [],
        },
      ],
    },
  ],
};

function Where() {
  const { pathname, search } = useLocation();
  return <output aria-label="Адрес">{pathname + search}</output>;
}

function setup(result: SearchResult = RESULT) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(result), { status: 200 })),
  );
  vi.stubGlobal('fetch', fetchMock);
  renderWithProviders(
    <>
      <HeaderSearch compact={false} />
      <Where />
    </>,
  );
  return { fetchMock, input: screen.getByRole('textbox', { name: 'Поиск' }) };
}

describe('HeaderSearch', () => {
  it('«/» ставит курсор в поле; найденное — группами, с подсветкой и «ещё N»', async () => {
    const { fetchMock, input } = setup();
    await userEvent.keyboard('/');
    expect(input).toHaveFocus();
    // «/» не попал в поле: это команда, а не буква.
    expect(input).toHaveValue('');

    await userEvent.type(input, 'огн');
    const list = screen.getByRole('listbox');
    const options = await within(list).findAllByRole('option');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/search?q=%D0%BE%D0%B3%D0%BD&limit=3'),
      expect.anything(),
    );
    expect(options.map((o) => o.textContent)).toEqual([
      'Огненный шарзаклинание · 3 круг',
      'Огненная стрелазаговор',
      'Ганс «Огнебород»НПС',
    ]);
    expect(options[2].querySelector('mark')).toHaveTextContent('Огн');
    // Пустая группа не показывается.
    expect(screen.queryByText('Монстры')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ещё 4' })).toHaveAttribute(
      'href',
      '/search?q=%D0%BE%D0%B3%D0%BD&kind=ability',
    );
    expect(
      screen.getByRole('link', { name: 'Все результаты: 7' }),
    ).toBeInTheDocument();
  });

  it('Enter открывает выбранную запись, ↓ выбирает следующую', async () => {
    const { input } = setup();
    await userEvent.type(input, 'огн');
    await screen.findAllByRole('option');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByLabelText('Адрес')).toHaveTextContent('/abilities/a2');
    // После перехода поле пустое, список закрыт.
    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('ничего не нашлось — так и пишет', async () => {
    const { input } = setup({ groups: [{ kind: 'map', total: 0, hits: [] }] });
    await userEvent.type(input, 'зюзя');
    expect(
      await screen.findByText('Ничего не нашлось по «зюзя»'),
    ).toBeInTheDocument();
  });

  it('одна буква — запроса нет', async () => {
    const { fetchMock, input } = setup();
    await userEvent.type(input, 'о');
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
