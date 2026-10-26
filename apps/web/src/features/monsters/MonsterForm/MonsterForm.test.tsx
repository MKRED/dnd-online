import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_MONSTER_STAT_BLOCK } from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { sampleMonster } from '../../../test/monsterFixture';
import { renderWithProviders } from '../../../test/render';
import MonsterForm from './MonsterForm';

function renderForm(onSaved = vi.fn()) {
  // Список своих моделей для раздела «3D-модель на карте» — пустой.
  const fetchMock = vi.fn<typeof fetch>((url) =>
    Promise.resolve(
      (url as string).includes('/voxel-models')
        ? new Response('[]')
        : new Response(JSON.stringify(sampleMonster), { status: 201 }),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  renderWithProviders(
    <MonsterForm
      monster={null}
      submitLabel="Создать"
      cancelTo="/monsters"
      onSaved={onSaved}
    />,
  );
  return { fetchMock, onSaved };
}

// Первая карточка характеристик — Сила.
const strengthCard = () =>
  screen
    .getAllByLabelText('Значение')[0]
    .closest('.mantine-Paper-root') as HTMLElement;

describe('MonsterForm', () => {
  it('создаёт монстра со стат-блоком по умолчанию', async () => {
    const { fetchMock, onSaved } = renderForm();
    await userEvent.type(screen.getByLabelText(/Название/), 'Крыса');
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }));

    expect(onSaved).toHaveBeenCalledWith(sampleMonster);
    const [url, init] = fetchMock.mock.calls.find(([target]) =>
      /\/monsters$/.test(target as string),
    )!;
    expect(url).toMatch(/\/monsters$/);
    expect(JSON.parse(init?.body as string)).toEqual({
      name: 'Крыса',
      description: '',
      sources: [],
      isPublic: false,
      category: 'humanoid',
      role: 'regular',
      model: null,
      statBlock: DEFAULT_MONSTER_STAT_BLOCK,
    });
  });

  it('спасбросок идёт за модификатором, пока его не меняли', async () => {
    renderForm();
    const card = within(strengthCard());
    const score = card.getByLabelText('Значение');
    await userEvent.clear(score);
    await userEvent.type(score, '18');
    expect(card.getByLabelText('Спасбросок')).toHaveValue('4');

    await userEvent.clear(card.getByLabelText('Спасбросок'));
    await userEvent.type(card.getByLabelText('Спасбросок'), '7');
    await userEvent.clear(score);
    await userEvent.type(score, '10');
    expect(card.getByLabelText('Спасбросок')).toHaveValue('7');
  });

  it('не отправляет форму с ошибками и перечисляет их у кнопки', async () => {
    // Форма прокручивает к первому полю с ошибкой; в jsdom прокрутки нет.
    Element.prototype.scrollIntoView = vi.fn();
    const { fetchMock } = renderForm();
    await userEvent.clear(screen.getByLabelText('Класс доспеха'));
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('Монстр не сохранён — исправьте поля');
    expect(summary).toHaveTextContent('Название — название — от 1 до 100');
    expect(summary).toHaveTextContent('Класс доспеха — обязательное поле');
    expect(
      fetchMock.mock.calls.filter(([url]) => /\/monsters/.test(url as string)),
    ).toHaveLength(0);
  });
});
