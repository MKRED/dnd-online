import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import type { Monster } from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { sampleMonster } from '../../../test/monsterFixture';
import { renderWithProviders } from '../../../test/render';
import MonsterListPage from './MonsterListPage';

const monsters: Monster[] = [
  sampleMonster,
  {
    ...sampleMonster,
    id: 'wolf',
    name: 'Волк',
    category: 'beast',
    role: 'regular',
    statBlock: { ...sampleMonster.statBlock, challenge: '1/4' },
  },
  {
    ...sampleMonster,
    id: 'rat',
    name: 'Крыса',
    category: 'beast',
    role: 'regular',
    statBlock: { ...sampleMonster.statBlock, challenge: '0' },
  },
];

function renderPage(route = '/monsters') {
  vi.stubGlobal(
    'fetch',
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(monsters))),
  );
  return renderWithProviders(
    <Routes>
      <Route path="/monsters" element={<MonsterListPage />} />
    </Routes>,
    { route },
  );
}

const shownNames = () =>
  screen
    .getAllByRole('link')
    .map((link) => link.textContent ?? '')
    .filter((text) => /Аболет|Волк|Крыса/.test(text));

describe('MonsterListPage', () => {
  it('фильтрует по типу чипами и по ПО диапазоном', async () => {
    renderPage();
    await screen.findByText('Аболет');
    expect(shownNames()).toHaveLength(3);

    const types = screen.getByRole('group', { name: 'Категории' });
    await userEvent.click(within(types).getByText('Зверь'));
    expect(shownNames()).toHaveLength(2);

    // Подпись «ПО от» есть и у группы, и у поля — берём поле.
    await userEvent.click(
      screen.getByLabelText('ПО от', { selector: 'input' }),
    );
    await userEvent.click(screen.getByRole('option', { name: '1/8' }));
    expect(shownNames()).toHaveLength(1);
    expect(shownNames()[0]).toContain('Волк');
  });

  it('читает фильтры из адреса и сбрасывает их кнопкой', async () => {
    renderPage('/monsters?cr_min=20');
    await screen.findByText('Под фильтры ничего не подошло.');

    await userEvent.click(
      screen.getByRole('button', { name: 'Сбросить фильтры' }),
    );
    expect(shownNames()).toHaveLength(3);
  });
});
