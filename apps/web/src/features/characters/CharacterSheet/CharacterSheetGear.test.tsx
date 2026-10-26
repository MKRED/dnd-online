import { screen, within } from '@testing-library/react';
import {
  itemEquip,
  type Character,
  type EquipSlot,
  type InventoryEntry,
  type ItemVariant,
} from 'shared';
import { describe, expect, it } from 'vitest';
import { sampleCharacter } from '../../../test/characterFixture';
import { renderWithProviders } from '../../../test/render';
import CharacterSheet from './CharacterSheet';

// Числа от надетого (docs/plan/equipment.md, этап 3). У персонажа фикстуры Сила 15,
// Ловкость 14, тренированность только с лёгкими доспехами, владение простым оружием,
// мастерство «Длинный меч».

const longsword: ItemVariant = {
  category: 'weapon',
  details: {
    base: 'longsword',
    weaponCategory: 'martial',
    attackType: 'melee',
    damage: { count: 1, die: 8, type: 'slashing' },
    extraDamage: [],
    properties: [],
    thrown: null,
    ammunition: null,
    versatile: { count: 1, die: 10 },
    mastery: 'sap',
    magicBonus: 0,
    attunement: false,
  },
};
const chainMail: ItemVariant = {
  category: 'armor',
  details: {
    base: 'chainMail',
    kind: 'heavy',
    armorClass: 16,
    strength: 13,
    stealthDisadvantage: true,
    magicBonus: 0,
    attunement: false,
  },
};

function worn(name: string, variant: ItemVariant, equipped: EquipSlot[]) {
  return {
    id: `row-${name}`,
    location: 'carried',
    quantity: 1,
    equipped,
    attuned: false,
    item: {
      id: `item-${name}`,
      name,
      category: variant.category,
      rarity: 'none',
      weight: 1,
      isPublic: true,
      image: null,
      equip: itemEquip(variant),
    },
    missing: null,
    inactive: false,
  } as InventoryEntry;
}

const sheet = (inventory: InventoryEntry[]): Character => ({
  ...sampleCharacter,
  effects: [],
  abilities: [],
  inventory,
});

describe('лист с надетым', () => {
  it('КД от доспеха с предупреждением, помеха к Скрытности', () => {
    renderWithProviders(
      <CharacterSheet
        character={sheet([worn('Кольчуга', chainMail, ['body'])])}
        aside={null}
      />,
    );
    const tile = screen.getByLabelText(/^Класс доспеха: /);
    expect(tile).toHaveAccessibleName(
      /^Класс доспеха: 16\. Кольчуга: 16 Нет тренированности с доспехом «Кольчуга»/,
    );
    expect(within(tile).getByText('Нет тренированности')).toBeInTheDocument();
    expect(screen.getByText('Помеха: Кольчуга')).toBeInTheDocument();
  });

  it('без надетого — число формы и блока «Атаки» нет', () => {
    renderWithProviders(<CharacterSheet character={sheet([])} aside={null} />);
    expect(screen.queryByLabelText(/^Класс доспеха: /)).toBeNull();
    expect(screen.queryByText('Атаки')).toBeNull();
    expect(screen.queryByText(/^Помеха:/)).toBeNull();
  });

  it('атака оружием в руке: без владения, с мастерством и уроном двумя руками', () => {
    renderWithProviders(
      <CharacterSheet
        character={sheet([worn('Длинный меч', longsword, ['meleeMain'])])}
        aside={null}
      />,
    );
    const attacks = screen.getByText('Атаки').closest('fieldset')!;
    const box = within(attacks);
    expect(box.getByText('Длинный меч')).toBeInTheDocument();
    expect(box.getByText('Ближний бой · 5 фт.')).toBeInTheDocument();
    expect(box.getByLabelText('Атака +2: Сила +2')).toBeInTheDocument();
    expect(box.getByText('1к8 + 2 рубящий')).toBeInTheDocument();
    expect(box.getByText('1к10 + 2 двумя руками')).toBeInTheDocument();
    expect(box.getByText('Мастерство: Ослабляющее')).toBeInTheDocument();
    expect(
      box.getByText('Без владения: без бонуса мастерства'),
    ).toBeInTheDocument();
  });
});
