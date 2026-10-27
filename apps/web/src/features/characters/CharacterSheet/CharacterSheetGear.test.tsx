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

function worn(
  name: string,
  variant: ItemVariant,
  equipped: EquipSlot[],
  attuned = false,
) {
  return {
    id: `row-${name}`,
    location: 'carried',
    quantity: 1,
    equipped,
    attuned,
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

  // Магия без настройки (вариант 2А макета 2026-10-27): числа без неё и строка, чего нет.
  it('без настройки: атака и КД без магии, строка «Нет настройки»', () => {
    const flame: ItemVariant = {
      category: 'weapon',
      details: {
        ...(longsword.details as object),
        magicBonus: 1,
        attunement: true,
        extraDamage: [{ count: 2, die: 6, type: 'fire' }],
      } as ItemVariant['details'],
    } as ItemVariant;
    const mail: ItemVariant = {
      category: 'armor',
      details: {
        ...(chainMail.details as object),
        kind: 'light',
        magicBonus: 1,
        attunement: true,
      } as ItemVariant['details'],
    } as ItemVariant;
    const inventory = [
      worn('Пламенный меч', flame, ['meleeMain']),
      worn('Кольчуга', mail, ['body']),
    ];
    const { unmount } = renderWithProviders(
      <CharacterSheet character={sheet(inventory)} aside={null} />,
    );
    const box = within(screen.getByText('Атаки').closest('fieldset')!);
    expect(box.getByLabelText('Атака +2: Сила +2')).toBeInTheDocument();
    expect(box.getByText('1к8 + 2 рубящий')).toBeInTheDocument();
    expect(
      box.getByText('Нет настройки: не действуют бонус +1 и урон 2к6 огонь'),
    ).toBeInTheDocument();
    const tile = screen.getByLabelText(/^Класс доспеха: /);
    expect(tile).toHaveAccessibleName(
      /^Класс доспеха: 18\. Кольчуга: 16 Ловкость: \+2 Нет настройки: не действует бонус \+1 доспеха «Кольчуга»/,
    );
    expect(within(tile).getByText('Нет настройки')).toBeInTheDocument();
    unmount();

    renderWithProviders(
      <CharacterSheet
        character={sheet([
          worn('Пламенный меч', flame, ['meleeMain'], true),
          worn('Кольчуга', mail, ['body'], true),
        ])}
        aside={null}
      />,
    );
    const attuned = within(screen.getByText('Атаки').closest('fieldset')!);
    expect(
      attuned.getByText('1к8 + 3 рубящий + 2к6 огонь'),
    ).toBeInTheDocument();
    expect(attuned.queryByText(/^Нет настройки/)).toBeNull();
    expect(screen.getByLabelText(/^Класс доспеха: 19\./)).toBeInTheDocument();
  });
});
