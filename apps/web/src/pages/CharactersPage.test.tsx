import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { sampleCharacter } from '../test/characterFixture';
import { renderWithProviders } from '../test/render';
import CharactersPage from './CharactersPage';

describe('CharactersPage', () => {
  it('ведёт с карточки на лист персонажа и на редактирование', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify([sampleCharacter]))),
      ),
    );
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
});
