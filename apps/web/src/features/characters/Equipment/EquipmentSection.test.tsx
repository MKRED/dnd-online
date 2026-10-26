import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  itemEquip,
  type Character,
  type EquipSlot,
  type InventoryEntry,
  type ItemVariant,
} from 'shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleCharacter } from '../../../test/characterFixture';
import { renderWithProviders } from '../../../test/render';
import EquipmentSection from './EquipmentSection';

const weapon = (twoHanded: boolean): ItemVariant => ({
  category: 'weapon',
  details: {
    base: null,
    weaponCategory: 'martial',
    attackType: 'melee',
    damage: { count: 1, die: 8, type: 'slashing' },
    extraDamage: [],
    properties: twoHanded ? ['twoHanded'] : [],
    thrown: null,
    ammunition: null,
    versatile: null,
    mastery: null,
    magicBonus: 0,
    attunement: false,
  },
});
const ring: ItemVariant = {
  category: 'jewelry',
  details: { slot: 'ring', attunement: true },
};

function entry(
  id: string,
  name: string,
  variant: ItemVariant,
  over: Partial<InventoryEntry> = {},
): InventoryEntry {
  return {
    id,
    location: 'carried',
    quantity: 1,
    equipped: [] as EquipSlot[],
    attuned: false,
    item: {
      id: `item-${id}`,
      name,
      category: variant.category,
      rarity: 'rare',
      weight: 1,
      isPublic: true,
      image: null,
      equip: itemEquip(variant),
    },
    missing: null,
    inactive: false,
    ...over,
  } as InventoryEntry;
}

const character = (inventory: InventoryEntry[]): Character => ({
  ...sampleCharacter,
  inventory,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EquipmentSection', () => {
  it('зрителю без надетого куклу не показывает', () => {
    renderWithProviders(
      <EquipmentSection
        character={character([entry('r', 'Кольцо защиты', ring)])}
        model={false}
      />,
    );
    expect(screen.queryByText('Экипировка')).not.toBeInTheDocument();
  });

  it('показывает надетое и двуручное на обе руки', () => {
    renderWithProviders(
      <EquipmentSection
        character={character([
          entry('g', 'Двуручный меч', weapon(true), {
            equipped: ['meleeMain'],
          }),
          entry('r', 'Кольцо защиты', ring, {
            equipped: ['ring2'],
            attuned: true,
          }),
        ])}
        model={false}
      />,
    );
    expect(
      screen.getByRole('button', {
        name: 'Обе руки · двуручное: Двуручный меч',
      }),
    ).toBeDisabled();
    // Вторая рука осталась только у дальнего боя.
    expect(
      screen.getAllByRole('button', { name: /^Вторая рука/ }),
    ).toHaveLength(1);
    expect(screen.getByText('Настроено 1 из 3')).toBeInTheDocument();
  });

  it('автор выбирает вещь на место — запрос с её строкой', async () => {
    const next = [
      entry('s', 'Короткий меч', weapon(false), { equipped: ['meleeOff'] }),
    ];
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(JSON.stringify(next), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onChange = vi.fn();
    renderWithProviders(
      <EquipmentSection
        character={character([
          entry('s', 'Короткий меч', weapon(false)),
          entry('r', 'Кольцо защиты', ring),
        ])}
        onChange={onChange}
        model={false}
      />,
    );

    const slots = screen.getAllByRole('button', { name: 'Вторая рука: пусто' });
    await userEvent.click(slots[0]);
    // Кольцо на руку не предлагается.
    expect(screen.queryByText('Кольцо защиты')).not.toBeInTheDocument();
    await userEvent.click(await screen.findByText('Короткий меч'));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(
      `/characters/${sampleCharacter.id}/equipment/meleeOff`,
    );
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ entryId: 's' });
    expect(onChange).toHaveBeenCalledWith(next);
  });
});
