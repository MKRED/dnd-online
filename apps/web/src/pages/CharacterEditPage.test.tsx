import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { sampleCharacter } from '../test/characterFixture';
import { renderWithProviders } from '../test/render';
import CharacterEditPage from './CharacterEditPage';

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

// Подменяем только сеть: charactersApi и маппинг формы работают настоящие.
function stubFetch(responses: { status: number; body?: unknown }[]): FetchMock {
  const fetchMock = vi.fn<typeof fetch>();
  for (const { status, body } of responses) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(body ?? {}), { status }),
    );
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderEditPage(id = sampleCharacter.id) {
  return renderWithProviders(
    <Routes>
      <Route path="/characters/:id/edit" element={<CharacterEditPage />} />
      <Route path="/characters" element={<p>Список персонажей</p>} />
    </Routes>,
    { route: `/characters/${id}/edit` },
  );
}

describe('CharacterEditPage', () => {
  it('заполняет форму данными персонажа', async () => {
    stubFetch([{ status: 200, body: sampleCharacter }]);
    renderEditPage();

    expect(await screen.findByLabelText(/Имя/)).toHaveValue('Арагорн');
    expect(screen.getByLabelText(/Вид/)).toHaveValue('Человек');
  });

  it('сохраняет изменения через PUT и возвращает к списку', async () => {
    const fetchMock = stubFetch([
      { status: 200, body: sampleCharacter },
      { status: 200, body: { ...sampleCharacter, name: 'Странник' } },
    ]);
    renderEditPage();
    const user = userEvent.setup();

    const nameInput = await screen.findByLabelText(/Имя/);
    await user.clear(nameInput);
    await user.type(nameInput, 'Странник');
    await user.click(
      screen.getByRole('button', { name: 'Сохранить изменения' }),
    );

    expect(await screen.findByText('Список персонажей')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toMatch(new RegExp(`/characters/${sampleCharacter.id}$`));
    expect(init?.method).toBe('PUT');
    const body = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(body.name).toBe('Странник');
    // Игровые поля (инвентарь, временные ХП) форма не шлёт — сервер их не трогает.
    expect(body).not.toHaveProperty('inventory');
    expect(body).not.toHaveProperty('hitPointsTemp');
  });

  it('показывает «Персонаж не найден» на 404', async () => {
    stubFetch([{ status: 404, body: { message: 'Персонаж не найден' } }]);
    renderEditPage();

    expect(await screen.findByText('Персонаж не найден')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Имя/)).not.toBeInTheDocument();
  });
});
