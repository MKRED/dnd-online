import { screen, waitFor } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { sampleCharacter } from '../test/characterFixture';
import { renderWithProviders } from '../test/render';
import CharactersPage from './CharactersPage';

// Показывает текущий history state, чтобы проверить, что страница его стирает.
function LocationStateProbe() {
  const location = useLocation();
  return <output>{JSON.stringify(location.state)}</output>;
}

function renderCharactersPage(state: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify([sampleCharacter]))),
    ),
  );
  return renderWithProviders(
    <Routes>
      <Route
        path="/characters"
        element={
          <>
            <CharactersPage />
            <LocationStateProbe />
          </>
        }
      />
    </Routes>,
    { route: { pathname: '/characters', state } },
  );
}

describe('CharactersPage', () => {
  it('подсвечивает изменённого персонажа и стирает state из истории', async () => {
    renderCharactersPage({ updatedId: sampleCharacter.id });

    expect(await screen.findByText('Изменён')).toBeInTheDocument();
    // После перезагрузки страницы state не вернётся — бейдж больше не появится.
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('null'),
    );
    expect(screen.getByText('Изменён')).toBeInTheDocument();
  });

  it('без state не показывает бейджей', async () => {
    renderCharactersPage(null);

    expect(await screen.findByText(sampleCharacter.name)).toBeInTheDocument();
    expect(screen.queryByText('Изменён')).not.toBeInTheDocument();
    expect(screen.queryByText('Новый')).not.toBeInTheDocument();
  });
});
