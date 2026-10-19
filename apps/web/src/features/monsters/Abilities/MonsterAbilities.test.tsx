import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  NO_ABILITY_COSTS,
  type Ability,
  type AbilityActivation,
  type MonsterAbilityEntry,
} from 'shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleMonster } from '../../../test/monsterFixture';
import { renderWithProviders } from '../../../test/render';
import MonsterSkills from './MonsterSkills';
import MonsterSpells from './MonsterSpells';

function row(
  name: string,
  activation: AbilityActivation,
  spell: { level: number; perDay: number | null } | null = null,
): MonsterAbilityEntry {
  return {
    id: `row-${name}`,
    perDay: spell?.perDay ?? null,
    ability: {
      id: `ability-${name}`,
      name,
      isPublic: true,
      image: null,
      category: spell ? 'spell' : 'monster',
      level: spell?.level ?? null,
      activation,
      costs: NO_ABILITY_COSTS,
      recharge: name === 'Кислотное дыхание' ? 5 : null,
    },
    missing: null,
    inactive: false,
  };
}

const amphibious = row('Амфибия', { kind: 'trait' });
const breath = row('Кислотное дыхание', { kind: 'action' });
const lash = row('Хлестнуть', { kind: 'legendary', cost: 2 });
const thoughts = row(
  'Обнаружение мыслей',
  { kind: 'action' },
  {
    level: 2,
    perDay: null,
  },
);
const dominate = row(
  'Подчинение чудовища',
  { kind: 'action' },
  {
    level: 8,
    perDay: 1,
  },
);

function renderBlocks(
  abilities: MonsterAbilityEntry[],
  onChange?: (abilities: MonsterAbilityEntry[]) => void,
) {
  const props = {
    monsterId: sampleMonster.id,
    abilities,
    block: sampleMonster.statBlock,
    onChange,
  };
  return renderWithProviders(
    <>
      <MonsterSkills {...props} />
      <MonsterSpells {...props} />
    </>,
    { auth: { user: { id: 'me', login: 'me', nickname: 'Я' } } },
  );
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

// Список вариантов Select прокручивает к выбранному; в jsdom прокрутки нет.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('способности на карточке монстра', () => {
  it('разделы стат-блока, заклинания по частоте с колдовством и кругом', () => {
    renderBlocks([dominate, lash, breath, thoughts, amphibious]);
    const skills = screen.getByRole('group', { name: 'Умения' });
    expect(
      within(skills)
        .getAllByText(/^(Черты|Действия|Легендарные действия.*)$/)
        .map((el) => el.textContent),
    ).toEqual([
      'Черты',
      'Действия',
      'Легендарные действия (3 за раунд, 4 в логове)',
    ]);
    expect(within(skills).getByText('Перезарядка 5–6'));
    expect(within(skills).getByText('стоит 2 действия'));

    const spells = screen.getByRole('group', { name: 'Заклинания' });
    expect(spells).toHaveTextContent('Колдовство: Интеллект, СЛ 16');
    expect(
      within(spells)
        .getAllByText(/^(Неограниченно|\d\/день)$/)
        .map((el) => el.textContent),
    ).toEqual(['Неограниченно', '1/день']);
    expect(within(spells).getByText('8 круг · Действие'));
    // Без onChange — только чтение.
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByLabelText(/^Частота/)).toBeNull();
  });

  it('автор меняет частоту заклинания в строке', async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      json([{ ...thoughts, perDay: 3 }]),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onChange = vi.fn();
    renderBlocks([thoughts], onChange);

    await userEvent.click(
      screen.getByLabelText('Частота «Обнаружение мыслей»', {
        selector: 'input',
      }),
    );
    await userEvent.click(screen.getByRole('option', { name: '3/день' }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(
      new RegExp(`/monsters/${sampleMonster.id}/abilities/row-Обнаружение`),
    );
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(init?.body as string)).toEqual({ perDay: 3 });
    expect(onChange).toHaveBeenCalledWith([{ ...thoughts, perDay: 3 }]);
  });

  it('окно: способности монстра первыми, у заклинания — «В день»', async () => {
    const catalogAbility = (
      id: string,
      name: string,
      category: 'basic' | 'monster',
    ): Ability =>
      ({
        id,
        authorId: 'me',
        authorNickname: 'Я',
        isPublic: true,
        name,
        description: '',
        sources: [],
        image: null,
        category,
        details: category === 'monster' ? { recharge: null } : {},
        activation: { kind: 'action' },
        costs: NO_ABILITY_COSTS,
        steps: [],
        createdAt: '2026-10-19T00:00:00.000Z',
        updatedAt: '2026-10-19T00:00:00.000Z',
      }) as Ability;
    const mine: Ability[] = [
      catalogAbility('a-bite', 'Атака', 'basic'),
      catalogAbility('a-tail', 'Хвост', 'monster'),
      {
        ...catalogAbility('a-charm', 'Внушение', 'basic'),
        category: 'spell',
        details: {
          level: 2,
          school: 'enchantment',
          components: 'В, М',
          ritual: false,
          duration: { kind: 'instant' },
        },
      },
    ];
    const fetchMock = vi.fn<typeof fetch>((input, init) => {
      if (init?.method === 'POST') return json([amphibious], 201);
      const url = typeof input === 'string' ? input : '';
      return json(url.includes('scope=mine') ? mine : []);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderBlocks([], vi.fn());

    await userEvent.click(
      screen.getByRole('button', { name: '+ Способность' }),
    );
    await screen.findByPlaceholderText('Найти по названию');
    const select = screen.getByRole('combobox', { name: 'Способность' });
    await userEvent.click(select);
    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['Хвост', 'Атака', 'Внушение · 2 круг']);

    await userEvent.click(screen.getByRole('option', { name: 'Хвост' }));
    expect(screen.queryByLabelText('В день')).toBeNull();
    await userEvent.click(select);
    await userEvent.click(
      screen.getByRole('option', { name: 'Внушение · 2 круг' }),
    );
    await userEvent.click(
      screen.getByLabelText('В день', { selector: 'input' }),
    );
    await userEvent.click(screen.getByRole('option', { name: '2/день' }));
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }));

    const post = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST');
    expect(JSON.parse(post?.[1]?.body as string)).toEqual({
      abilityId: 'a-charm',
      perDay: 2,
    });
  });
});
