import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from 'shared';
import { sampleCharacter } from '../test/characterFixture';
import { renderWithProviders } from '../test/render';
import CharacterViewPage from './CharacterViewPage';

// Первым запросом страница читает персонажа, вторым — его картинки.
function stubFetch(responses: { status: number; body: unknown }[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const { status, body } of responses) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(body), { status }),
    );
  }
  vi.stubGlobal('fetch', fetchMock);
}

function renderViewPage(userId: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/characters/:id" element={<CharacterViewPage />} />
    </Routes>,
    {
      route: `/characters/${sampleCharacter.id}`,
      auth: {
        user: {
          id: userId,
          login: 'someone',
          nickname: 'Кто-то',
          settings: DEFAULT_USER_SETTINGS,
        },
      },
    },
  );
}

describe('CharacterViewPage', () => {
  it('показывает автору лист с посчитанными бонусами и его действия', async () => {
    stubFetch([
      { status: 200, body: sampleCharacter },
      { status: 200, body: [] },
    ]);
    renderViewPage(sampleCharacter.userId);

    expect(
      await screen.findByRole('heading', { name: 'Арагорн' }),
    ).toBeInTheDocument();
    // Инициатива — модификатор Ловкости 14, то есть +2.
    expect(screen.getByText('Инициатива').nextSibling).toHaveTextContent('+2');
    // Выживание с экспертизой: Мудрость 12 (+1) + 2 × бонус мастерства 2.
    expect(screen.getByText('Выживание').parentElement).toHaveTextContent('+5');
    expect(screen.getByText('30 ЗМ · 2 СМ · 1 ММ')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Редактировать' })).toHaveAttribute(
      'href',
      `/characters/${sampleCharacter.id}/edit`,
    );
    // Пустой раздел не показывается: в фикстуре нет инструментов.
    expect(screen.queryByText('Инструменты')).not.toBeInTheDocument();
  });

  it('зрителю по ссылке показывает автора и не даёт править', async () => {
    stubFetch([
      { status: 200, body: { ...sampleCharacter, linkAccess: 'link' } },
      { status: 200, body: [] },
    ]);
    renderViewPage('someone-else');

    expect(
      await screen.findByText('Автор: claude_smoketest · только просмотр'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Редактировать' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('← К персонажам')).not.toBeInTheDocument();
  });

  it('на 404 говорит, что доступ могли закрыть', async () => {
    stubFetch([{ status: 404, body: { message: 'Персонаж не найден' } }]);
    renderViewPage('someone-else');

    expect(
      await screen.findByText(
        'Персонаж не найден. Возможно, автор закрыл к нему доступ.',
      ),
    ).toBeInTheDocument();
  });
});
