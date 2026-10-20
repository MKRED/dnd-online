import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Item, MonsterItemEntry } from 'shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from 'shared';
import { sampleMonster } from '../../../test/monsterFixture';
import { renderWithProviders } from '../../../test/render';
import MonsterGear from './MonsterGear';

const dagger: MonsterItemEntry = {
  id: 'row-dagger',
  quantity: 2,
  item: {
    id: 'item-dagger',
    name: 'Кинжал',
    category: 'basic',
    rarity: 'none',
    weight: 1,
    isPublic: true,
    image: null,
  },
  missing: null,
  inactive: false,
};
const gone: MonsterItemEntry = {
  id: 'row-gone',
  quantity: 1,
  item: null,
  missing: 'deleted',
};

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const renderGear = (
  items: MonsterItemEntry[],
  onChange?: (items: MonsterItemEntry[]) => void,
) =>
  renderWithProviders(
    <MonsterGear
      monsterId={sampleMonster.id}
      items={items}
      onChange={onChange}
    />,
    {
      auth: {
        user: {
          id: 'me',
          login: 'me',
          nickname: 'Я',
          settings: DEFAULT_USER_SETTINGS,
        },
      },
    },
  );

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('снаряжение монстра', () => {
  it('чужому — строки без кнопок; пустое снаряжение не показывается', () => {
    const { unmount } = renderGear([dagger, gone]);
    expect(screen.getByRole('link', { name: 'Кинжал' })).toHaveAttribute(
      'href',
      '/items/item-dagger',
    );
    expect(screen.getByText('×2')).toBeInTheDocument();
    expect(screen.getByText('Предмет удалён автором')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    unmount();

    renderGear([]);
    expect(screen.queryByRole('group', { name: 'Снаряжение' })).toBeNull();
  });

  it('автор меняет количество через меню и убирает заглушку', async () => {
    const fetchMock = vi.fn<typeof fetch>((_input, init) =>
      json(
        init?.method === 'PATCH'
          ? [{ ...dagger, quantity: 5 }, gone]
          : [dagger],
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onChange = vi.fn();
    renderGear([dagger, gone], onChange);

    await userEvent.click(screen.getByRole('button', { name: 'Ещё: Кинжал' }));
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Изменить количество' }),
    );
    const input = screen.getByLabelText('Количество');
    await userEvent.clear(input);
    await userEvent.type(input, '5');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/monsters\/[^/]+\/items\/row-dagger$/);
    expect(JSON.parse(init?.body as string)).toEqual({ quantity: 5 });
    expect(onChange).toHaveBeenLastCalledWith([
      { ...dagger, quantity: 5 },
      gone,
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Убрать' }));
    expect(fetchMock.mock.calls[1][1]?.method).toBe('DELETE');
    expect(onChange).toHaveBeenLastCalledWith([dagger]);
  });

  it('окно: уже добавленный предмет выбрать нельзя, POST с количеством', async () => {
    const item = (id: string, name: string): Item => ({
      id,
      authorId: 'me',
      authorNickname: 'Я',
      isPublic: true,
      name,
      description: '',
      sources: [],
      image: null,
      category: 'basic',
      details: {},
      rarity: 'none',
      weight: 1,
      cost: null,
      createdAt: '2026-10-19T00:00:00.000Z',
      updatedAt: '2026-10-19T00:00:00.000Z',
    });
    const mine = [item('item-dagger', 'Кинжал'), item('item-rope', 'Верёвка')];
    const fetchMock = vi.fn<typeof fetch>((input, init) => {
      if (init?.method === 'POST') return json([dagger], 201);
      const url = typeof input === 'string' ? input : '';
      return json(url.includes('scope=mine') ? mine : []);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderGear([dagger], vi.fn());

    await userEvent.click(screen.getByRole('button', { name: '+ Предмет' }));
    await screen.findByPlaceholderText('Найти по названию');
    await userEvent.click(screen.getByRole('combobox', { name: 'Предмет' }));
    expect(
      screen.getByRole('option', { name: 'Кинжал · уже есть' }),
    ).toHaveAttribute('data-combobox-disabled', 'true');
    await userEvent.click(screen.getByRole('option', { name: 'Верёвка' }));
    const quantity = screen.getByLabelText('Количество');
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '3');
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }));

    const post = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST');
    expect(JSON.parse(post?.[1]?.body as string)).toEqual({
      itemId: 'item-rope',
      quantity: 3,
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Добавлено: Верёвка ×3',
    );
  });
});
