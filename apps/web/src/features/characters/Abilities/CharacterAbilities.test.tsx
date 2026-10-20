import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  Ability,
  AbilityActivation,
  Character,
  CharacterAbilityEntry,
  SpellSlots,
} from 'shared';
import { NO_ABILITY_COSTS, DEFAULT_USER_SETTINGS } from 'shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleCharacter } from '../../../test/characterFixture';
import { renderWithProviders } from '../../../test/render';
import CharacterAbilities from './CharacterAbilities';

function row(
  name: string,
  level: number | null,
  activation: AbilityActivation = { kind: 'action' },
  prepared = false,
): CharacterAbilityEntry {
  return {
    id: `row-${name}`,
    prepared,
    ability: {
      id: `ability-${name}`,
      name,
      isPublic: true,
      image: null,
      category: level === null ? 'basic' : 'spell',
      level,
      activation,
      costs: NO_ABILITY_COSTS,
      recharge: null,
    },
    missing: null,
    inactive: false,
  };
}

const surge = row('Всплеск действий', null);
const parry = row('Парирование', null, {
  kind: 'reaction',
  trigger: 'когда по вам попадают',
});
const firebolt = row('Огненный снаряд', 0);
const shield = row('Щит', 1, { kind: 'reaction', trigger: '' }, true);
const hidden: CharacterAbilityEntry = {
  id: 'row-hidden',
  prepared: false,
  ability: null,
  missing: 'hidden',
};

const character = (
  abilities: CharacterAbilityEntry[],
  spellSlots: SpellSlots = {},
): Character => ({ ...sampleCharacter, abilities, spellSlots });

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CharacterAbilities', () => {
  it('умения по активации, недоступные отдельно; заклинания по кругам с ячейками', () => {
    renderWithProviders(
      <CharacterAbilities
        character={character([shield, surge, hidden, parry, firebolt], {
          1: { total: 2, expended: 0 },
          3: { total: 1, expended: 0 },
        })}
      />,
    );
    const skills = screen.getByRole('group', { name: 'Умения' });
    expect(
      within(skills)
        .getAllByText(/^(Действие|Реакция|Недоступны)$/)
        .map((el) => el.textContent),
    ).toEqual(['Действие', 'Реакция', 'Недоступны']);
    expect(within(skills).getByText('когда по вам попадают'));
    expect(within(skills).getByText('Способность скрыта автором'));
    expect(within(skills).queryByText('Щит')).toBeNull();

    const spells = screen.getByRole('group', { name: 'Заклинания' });
    // Круг без заклинаний, но с ячейками, тоже виден.
    expect(
      within(spells)
        .getAllByText(/^(Заговоры|\d круг)$/)
        .map((el) => el.textContent),
    ).toEqual(['Заговоры', '1 круг', '3 круг']);
    expect(within(spells).getByRole('link', { name: 'Щит' })).toHaveAttribute(
      'href',
      '/abilities/ability-Щит',
    );
    // Зритель видит отметку, но не кнопки.
    expect(within(spells).getByRole('img', { name: 'Подготовлено' }));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('зритель без способностей не видит «Умений», автор видит пустое состояние', () => {
    const { unmount } = renderWithProviders(
      <CharacterAbilities character={character([])} />,
    );
    expect(screen.queryByRole('group', { name: 'Умения' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Заклинания' })).toBeNull();
    unmount();

    renderWithProviders(
      <CharacterAbilities
        character={character([])}
        onAbilitiesChange={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        'Способностей пока нет — добавьте умения и заклинания из каталога.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Способность' }));
  });

  it('отметка «подготовлено» — только у заклинания 1 круга, клик шлёт PATCH', async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      json([{ ...shield, prepared: false }]),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onChange = vi.fn();
    renderWithProviders(
      <CharacterAbilities
        character={character([firebolt, shield])}
        onAbilitiesChange={onChange}
      />,
    );
    expect(
      screen.getAllByRole('button', { name: /подготовлено$/ }),
    ).toHaveLength(1);
    const mark = screen.getByRole('button', { name: '«Щит» подготовлено' });
    expect(mark).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(mark);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/characters\/.+\/abilities\/row-Щит$/);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ prepared: false });
    expect(onChange).toHaveBeenCalledWith([{ ...shield, prepared: false }]);
  });

  it('автор убирает строку крестиком, без подтверждения; ошибка — под строками', async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      json({ message: 'Способность на персонаже не найдена' }, 404),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onChange = vi.fn();
    renderWithProviders(
      <CharacterAbilities
        character={character([hidden])}
        onAbilitiesChange={onChange}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Убрать «Способность скрыта автором»',
      }),
    );
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/abilities\/row-hidden$/);
    expect(init.method).toBe('DELETE');
    expect(
      await screen.findByText('Способность на персонаже не найдена'),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('добавить: уже добавленную выбрать нельзя, монстровых нет, окно остаётся открытым, 409 — в окне', async () => {
    const catalogAbility = (
      id: string,
      name: string,
      authorId: string,
    ): Ability => ({
      id,
      name,
      authorId,
      authorNickname: authorId === 'me' ? 'Я' : 'Мастер',
      isPublic: true,
      description: '',
      sources: [],
      image: null,
      category: 'basic',
      details: {},
      activation: { kind: 'action' },
      costs: NO_ABILITY_COSTS,
      steps: [],
      createdAt: '2026-10-19T00:00:00.000Z',
      updatedAt: '2026-10-19T00:00:00.000Z',
    });
    const mine = [
      catalogAbility('ability-Всплеск действий', 'Всплеск действий', 'me'),
    ];
    const catalog = [
      catalogAbility('a-rage', 'Ярость', 'gm'),
      {
        ...catalogAbility('a-lash', 'Хлестнуть', 'gm'),
        category: 'monster',
        details: { recharge: null },
        activation: { kind: 'legendary', cost: 1 },
      } satisfies Ability,
    ];
    let posts = 0;
    const fetchMock = vi.fn<typeof fetch>((input, init) => {
      const url = typeof input === 'string' ? input : '';
      if (init?.method === 'POST') {
        posts += 1;
        return posts === 1
          ? json([surge, row('Ярость', null)], 201)
          : json({ message: 'Способность уже добавлена' }, 409);
      }
      return json(url.includes('scope=mine') ? mine : catalog);
    });
    vi.stubGlobal('fetch', fetchMock);
    Element.prototype.scrollIntoView = vi.fn();
    const onChange = vi.fn();
    renderWithProviders(
      <CharacterAbilities
        character={character([surge])}
        onAbilitiesChange={onChange}
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
    await userEvent.click(
      screen.getByRole('button', { name: '+ Способность' }),
    );
    const select = await screen.findByRole('combobox', { name: 'Способность' });
    await screen.findByPlaceholderText('Найти по названию');
    await userEvent.click(select);
    expect(
      await screen.findByRole('option', {
        name: 'Всплеск действий · уже добавлена',
      }),
    ).toHaveAttribute('data-combobox-disabled', 'true');
    expect(
      screen.queryByRole('option', { name: /Хлестнуть/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('option', { name: 'Ярость · Мастер' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Добавлено: Ярость · Мастер',
    );
    expect(onChange).toHaveBeenCalledTimes(1);

    await userEvent.click(select);
    await userEvent.click(
      screen.getByRole('option', { name: 'Ярость · Мастер' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(
      await screen.findByText('Способность уже добавлена'),
    ).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
