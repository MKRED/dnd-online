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

// Вторым запросом страница читает галерею картинок персонажа.
const EMPTY_GALLERY = { status: 200, body: [] };

function renderEditPage(id = sampleCharacter.id) {
  return renderWithProviders(
    <Routes>
      <Route path="/characters/:id/edit" element={<CharacterEditPage />} />
      <Route path="/characters/:id" element={<p>Лист персонажа</p>} />
    </Routes>,
    { route: `/characters/${id}/edit` },
  );
}

// Форма персонажа большая: в jsdom её отрисовка занимает 1,5–2 с даже без нагрузки,
// а при параллельных прогонах не укладывалась в стандартные 5 с.
describe('CharacterEditPage', { timeout: 15_000 }, () => {
  it('заполняет форму данными персонажа', async () => {
    stubFetch([{ status: 200, body: sampleCharacter }, EMPTY_GALLERY]);
    renderEditPage();

    expect(await screen.findByLabelText(/Имя/)).toHaveValue('Арагорн');
    // Раса — Select: у него подпись «Раса» есть и на поле, и на списке вариантов.
    expect(screen.getByRole('combobox', { name: /Раса/ })).toHaveValue(
      'Человек',
    );
  });

  it('во время встречи вместо формы — почему лист закрыт', async () => {
    stubFetch([
      {
        status: 200,
        body: {
          ...sampleCharacter,
          sheetLock: { gameId: 'g1', gameName: 'Логово дракона' },
        },
      },
      EMPTY_GALLERY,
    ]);
    renderEditPage();

    expect(await screen.findByText('Лист закрыт')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Имя/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Сохранить изменения' }),
    ).not.toBeInTheDocument();
  });

  it('сохраняет изменения через PUT и открывает лист персонажа', async () => {
    const fetchMock = stubFetch([
      { status: 200, body: sampleCharacter },
      EMPTY_GALLERY,
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

    expect(await screen.findByText('Лист персонажа')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[2];
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
