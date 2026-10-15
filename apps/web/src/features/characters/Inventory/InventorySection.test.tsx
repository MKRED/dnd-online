import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Character, InventoryEntry } from 'shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleCharacter } from '../../../test/characterFixture';
import { renderWithProviders } from '../../../test/render';
import InventorySection from './InventorySection';

function entry(
  id: string,
  location: InventoryEntry['location'],
  quantity: number,
  weight: number,
): Extract<InventoryEntry, { missing: null }> {
  return {
    id,
    location,
    quantity,
    item: {
      id: `item-${id}`,
      name: `Предмет ${id}`,
      category: 'basic',
      rarity: 'none',
      weight,
      isPublic: true,
      image: null,
    },
    missing: null,
    inactive: false,
  };
}

const hidden: InventoryEntry = {
  id: 'h',
  location: 'carried',
  quantity: 1,
  item: null,
  missing: 'hidden',
};

// Сила 10 → нести до 150 фнт.
function character(inventory: InventoryEntry[]): Character {
  return {
    ...sampleCharacter,
    abilityScores: { ...sampleCharacter.abilityScores, strength: 10 },
    inventory,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('InventorySection', () => {
  it('считает груз только при себе и пишет про скрытые', () => {
    renderWithProviders(
      <InventorySection
        character={character([
          entry('a', 'carried', 2, 5),
          entry('b', 'stash', 1, 100),
          hidden,
        ])}
      />,
    );
    expect(screen.getByText('10 / 150 фнт.')).toBeInTheDocument();
    expect(screen.getByText('Предмет скрыт автором')).toBeInTheDocument();
    expect(
      screen.getByText('Без скрытых и удалённых предметов'),
    ).toBeInTheDocument();
    expect(screen.getByText('▸ Хранилище · 1')).toBeInTheDocument();
  });

  // Автор скрытого предмета на чужом листе: карточка видна, но в груз не входит.
  it('не действующий предмет — с пометкой и без веса в грузе', () => {
    renderWithProviders(
      <InventorySection
        character={character([
          entry('a', 'carried', 1, 5),
          { ...entry('b', 'carried', 1, 50), inactive: true },
        ])}
      />,
    );
    expect(screen.getByText('5 / 150 фнт.')).toBeInTheDocument();
    expect(screen.getByText('Предмет b')).toBeInTheDocument();
    expect(screen.getByText('Не действует')).toBeInTheDocument();
  });

  it('при перегрузе пишет об этом', () => {
    renderWithProviders(
      <InventorySection
        character={character([entry('a', 'carried', 1, 200)])}
      />,
    );
    expect(screen.getByText(/перегруз/)).toBeInTheDocument();
  });

  it('зрителю — без действий', () => {
    renderWithProviders(
      <InventorySection character={character([entry('a', 'carried', 1, 1)])} />,
    );
    expect(screen.queryByText('+ Добавить предмет')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /В хранилище/ })).toBeNull();
  });

  it('автор перекладывает одну штуку в хранилище одним кликом', async () => {
    const moved = [entry('a', 'stash', 1, 1)];
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(JSON.stringify(moved), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onChange = vi.fn();
    renderWithProviders(
      <InventorySection
        character={character([entry('a', 'carried', 1, 1)])}
        onChange={onChange}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'В хранилище: Предмет a' }),
    );

    // apiRequest зовёт fetch строкой адреса и телом-строкой JSON.
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`/characters/${sampleCharacter.id}/items/a/move`);
    expect(JSON.parse(init.body as string)).toEqual({
      location: 'stash',
      quantity: 1,
    });
    expect(onChange).toHaveBeenCalledWith(moved);
  });
});
