import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from 'shared';
import { sampleMonster } from '../../test/monsterFixture';
import { renderWithProviders } from '../../test/render';
import MonsterViewPage from './MonsterViewPage';

function renderPage(
  userId: string,
  body: unknown = sampleMonster,
  status = 200,
) {
  // Звёздочка спрашивает своё состояние отдельно от карточки.
  const fetchMock = vi.fn<typeof fetch>((url) =>
    Promise.resolve(
      typeof url === 'string' && url.includes('/bookmarks/')
        ? new Response(JSON.stringify({ bookmarked: false }))
        : new Response(JSON.stringify(body), { status }),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return renderWithProviders(
    <Routes>
      <Route path="/monsters/:id" element={<MonsterViewPage />} />
    </Routes>,
    {
      route: `/monsters/${sampleMonster.id}`,
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

describe('MonsterViewPage', () => {
  it('показывает стат-блок как ввёл мастер и действия автора', async () => {
    renderPage(sampleMonster.authorId);

    expect(
      await screen.findByRole('heading', { name: 'Аболет' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Большая аберрация, законно-злой'),
    ).toBeInTheDocument();
    expect(screen.getByText('Уникальный')).toBeInTheDocument();
    expect(
      screen.getByText(
        // Неразрывные пробелы в числах поиск по тексту сводит к обычным.
        'ПО 10 · Опыт 5 900 (7 200 в логове) · Бонус мастерства +4',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Инициатива').nextSibling).toHaveTextContent(
      '+7 (17)',
    );
    expect(screen.getByText('20к10 + 40')).toBeInTheDocument();
    expect(screen.getByText('Плавание 40 фт')).toBeInTheDocument();
    // Спасбросок Ловкости +3 при модификаторе −1 — владение.
    expect(screen.getByText('Спасбросок +3')).toBeInTheDocument();
    expect(screen.getByText('История +12, Восприятие +10')).toBeInTheDocument();
    expect(screen.getByText('3 за раунд, 4 в логове')).toBeInTheDocument();
    // Способности автор меняет прямо на карточке.
    expect(screen.getByRole('button', { name: '+ Способность' }));
    expect(screen.getByRole('link', { name: 'Редактировать' })).toHaveAttribute(
      'href',
      `/monsters/${sampleMonster.id}/edit`,
    );
  });

  it('чужому показывает карточку без кнопок и ведёт назад в каталог', async () => {
    renderPage('someone-else');

    expect(
      await screen.findByRole('heading', { name: 'Аболет' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Редактировать' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Умения' })).toBeNull();
    // Закладку на чужого монстра ставит любой, кто его видит.
    expect(
      await screen.findByRole('button', { name: 'Добавить в закладки' }),
    ).toBeEnabled();
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(
          ([url]) =>
            typeof url === 'string' &&
            url.endsWith(`/bookmarks/monster/${sampleMonster.id}`),
        ),
    ).toBe(true);
    expect(screen.getByRole('link', { name: '← К монстрам' })).toHaveAttribute(
      'href',
      '/monsters?tab=catalog',
    );
  });

  it('с эффектом — итог КД и скорости, переключатель показывает стат-блок', async () => {
    renderPage('someone-else', {
      ...sampleMonster,
      effects: [
        {
          id: 'row-skin',
          effect: {
            id: 'skin',
            name: 'Каменная кожа',
            isPublic: true,
            image: null,
            components: [{ kind: 'armor_class', change: 'bonus', value: 2 }],
            duration: { kind: 'permanent' },
            saveEnds: null,
          },
          missing: null,
          inactive: false,
        },
      ],
    });
    await screen.findByRole('heading', { name: 'Аболет' });
    expect(
      screen.getByRole('link', { name: 'Каменная кожа' }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/^Класс доспеха: 19\. В форме 17\./),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByText('Без эффектов'));
    expect(screen.getByText('Класс доспеха').nextSibling).toHaveTextContent(
      '17',
    );
  });

  it('на 404 говорит, что монстра нет', async () => {
    renderPage('someone-else', { message: 'Монстр не найден' }, 404);

    expect(await screen.findByText('Монстр не найден')).toBeInTheDocument();
  });
});
