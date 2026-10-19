import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Character } from 'shared';
import { sampleCharacter } from '../../test/characterFixture';
import { renderWithProviders } from '../../test/render';
import CharactersPage from './CharactersPage';

const npc: Character = {
  ...sampleCharacter,
  id: '22222222-2222-4222-8222-222222222222',
  kind: 'npc',
  name: 'Трактирщик',
};

function stubList(list: Character[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(list)))),
  );
}

describe('CharactersPage', () => {
  it('ведёт с карточки на лист персонажа и на редактирование', async () => {
    stubList([sampleCharacter]);
    renderWithProviders(<CharactersPage />, { route: '/characters' });

    const name = await screen.findByRole('link', {
      name: sampleCharacter.name,
    });
    expect(name).toHaveAttribute('href', `/characters/${sampleCharacter.id}`);
    expect(screen.getByRole('link', { name: 'Редактировать' })).toHaveAttribute(
      'href',
      `/characters/${sampleCharacter.id}/edit`,
    );
  });

  it('по умолчанию показывает игровых, чип «НПС» — НПС и создание НПС', async () => {
    stubList([sampleCharacter, npc]);
    renderWithProviders(<CharactersPage />, { route: '/characters' });

    await screen.findByRole('link', { name: sampleCharacter.name });
    expect(screen.queryByText(npc.name)).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Создать персонажа' }),
    ).toHaveAttribute('href', '/characters/new');

    await userEvent.click(screen.getByRole('radio', { name: /НПС/ }));
    expect(screen.getByRole('link', { name: npc.name })).toBeInTheDocument();
    expect(screen.queryByText(sampleCharacter.name)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Создать НПС' })).toHaveAttribute(
      'href',
      '/characters/new?kind=npc',
    );
  });

  it('открывается сразу на НПС по адресу и пишет, что их нет', async () => {
    stubList([sampleCharacter]);
    renderWithProviders(<CharactersPage />, { route: '/characters?kind=npc' });

    expect(await screen.findByText(/НПС пока нет/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Игровые/ })).not.toBeChecked();
  });
});
