import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  NO_ABILITY_COSTS,
  type Character,
  type CharacterAbilityEntry,
  type CharacterEffectEntry,
  type EffectComponent,
} from 'shared';
import { describe, expect, it } from 'vitest';
import { sampleCharacter } from '../../../test/characterFixture';
import { renderWithProviders } from '../../../test/render';
import CharacterSheet from './CharacterSheet';
import { armorClassTile } from './sheetArmorClass';
import { speedTile } from './sheetSpeed';

const entry = (
  name: string,
  components: EffectComponent[],
): CharacterEffectEntry => ({
  id: `row-${name}`,
  effect: {
    id: `effect-${name}`,
    name,
    isPublic: true,
    image: null,
    components,
    duration: { kind: 'permanent' },
    saveEnds: null,
  },
  missing: null,
  inactive: false,
});
const haste = entry('Ускорение', [
  { kind: 'speed', change: 'double', feet: null, hover: false },
]);
const wings = entry('Крылья', [
  { kind: 'speed', change: 'fly', feet: 60, hover: true },
  { kind: 'sense', sense: 'darkvision', range: 60 },
]);

const sheet = (effects: CharacterEffectEntry[]): Character => ({
  ...sampleCharacter,
  speed: 30,
  effects,
});
const speedTileText = () =>
  screen.getByText('Скорость', { selector: 'p' }).closest('div')!.textContent;

describe('лист с эффектами', () => {
  it('без эффектов — нет переключателя, Скорость из формы', () => {
    renderWithProviders(<CharacterSheet character={sheet([])} aside={null} />);
    expect(screen.queryByRole('radio', { name: 'С эффектами' })).toBeNull();
    expect(screen.getByText('30 фт')).toBeInTheDocument();
  });

  it('итог с выделением и сводкой; «Без эффектов» — база и без сводки', async () => {
    renderWithProviders(
      <CharacterSheet character={sheet([haste, wings])} aside={null} />,
    );
    expect(screen.getByRole('radio', { name: 'С эффектами' })).toBeChecked();
    const tile = screen.getByLabelText(/^Скорость: 60 фт\./);
    expect(tile).toHaveAccessibleName(
      'Скорость: 60 фт. В форме 30 фт. Ускорение: Скорость вдвое больше. Крылья: Скорость полёта 60 фт., может парить.',
    );
    expect(within(tile).getByText('Полёт 120 фт, парит')).toBeInTheDocument();
    expect(screen.getByText('Тёмное зрение, 60 фт.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Без эффектов' }));
    expect(screen.queryByLabelText(/^Скорость: /)).toBeNull();
    expect(speedTileText()).toBe('Скорость30 фт');
    expect(screen.queryByText('Тёмное зрение, 60 фт.')).toBeNull();
  });
});

// docs/plan/done/traits.md: черта меняет число и в виде «Без эффектов».
it('черта: КД с ней в обоих видах, её защита — в сводке без эффектов', async () => {
  const trait: CharacterAbilityEntry = {
    id: 'row-trait',
    prepared: false,
    ability: {
      id: 'ability-trait',
      name: 'Защитный бой',
      isPublic: true,
      image: null,
      category: 'basic',
      level: null,
      activation: { kind: 'trait' },
      costs: NO_ABILITY_COSTS,
      recharge: null,
      passive: [
        { kind: 'armor_class', change: 'bonus', value: 1 },
        {
          kind: 'defense',
          level: 'resistance',
          damageTypes: ['poison'],
          conditions: [],
        },
      ],
    },
    missing: null,
    inactive: false,
  };
  const faith = entry('Щит веры', [
    { kind: 'armor_class', change: 'bonus', value: 2 },
  ]);
  renderWithProviders(
    <CharacterSheet
      character={{ ...sheet([faith]), abilities: [trait] }}
      aside={null}
    />,
  );
  expect(screen.getByLabelText(/^Класс доспеха: /)).toHaveAccessibleName(
    'Класс доспеха: 18. В форме 15. Защитный бой: КД +1. Щит веры: КД +2.',
  );
  await userEvent.click(screen.getByRole('radio', { name: 'Без эффектов' }));
  expect(screen.getByLabelText(/^Класс доспеха: /)).toHaveAccessibleName(
    'Класс доспеха: 16. В форме 15. Защитный бой: КД +1.',
  );
  expect(screen.getByText('Сопротивление: Яд')).toBeInTheDocument();
  // Черта — в «Умениях», своей группой со строкой того, что она даёт.
  expect(screen.getByText('Черты')).toBeInTheDocument();
});

// КД 15 в форме, Ловкость 14 (+2): Доспехи мага дают 15 — не больше, но плитка
// выделена и объясняет, почему число то же.
it('КД: Щит веры и Доспехи мага — итог и подсказка', async () => {
  const faith = entry('Щит веры', [
    { kind: 'armor_class', change: 'bonus', value: 2 },
  ]);
  const mage = entry('Доспехи мага', [
    { kind: 'armor_class', change: 'base', value: 13 },
  ]);
  renderWithProviders(
    <CharacterSheet character={sheet([faith, mage])} aside={null} />,
  );
  expect(screen.getByLabelText(/^Класс доспеха: /)).toHaveAccessibleName(
    'Класс доспеха: 17. В форме 15. Щит веры: КД +2. Доспехи мага: Базовый КД 13 + модификатор Ловкости.',
  );

  await userEvent.click(screen.getByRole('radio', { name: 'Без эффектов' }));
  expect(screen.queryByLabelText(/^Класс доспеха: /)).toBeNull();
  expect(
    screen.getByText('Класс доспеха', { selector: 'p' }).closest('div')!
      .textContent,
  ).toBe('Класс доспеха15');
});

it('КД: Доспехи мага слабее КД формы — число то же, но объяснено', () => {
  const mage = entry('Доспехи мага', [
    { kind: 'armor_class', change: 'base', value: 13 },
  ]);
  renderWithProviders(
    <CharacterSheet character={sheet([mage])} aside={null} />,
  );
  expect(
    screen.getByLabelText(/^Класс доспеха: 15\. В форме 15\./),
  ).toBeInTheDocument();
});

describe('speedTile', () => {
  it('эффекты без изменений Скорости — число не выделено', () => {
    const totals = {
      speed: { speed: 30, special: {}, hover: false },
      speedChanges: [],
      armorClass: 15,
      armorClassChanges: [],
      conditions: [],
      defenses: [],
      senses: [],
      rolls: [],
      noHealing: [],
      perTurn: [],
      perception: { shift: 0, lines: [] },
    };
    expect(speedTile(30, totals)).toEqual({ value: '30 фт' });
    expect(speedTile(30, null)).toEqual({ value: '30 фт' });
    expect(armorClassTile(15, totals)).toEqual({ value: '15' });
  });

  // У монстра особые скорости есть и без эффектов (docs/plan/done/monsters-npcs.md, этап 6).
  it('свои особые скорости — не изменение', () => {
    const swim = { special: { swim: 40 }, hover: false };
    const totals = (speed: number, special: { swim: number }) => ({
      speed: { speed, special, hover: false },
      speedChanges:
        speed === 10
          ? []
          : [{ text: 'Скорость вдвое больше', from: ['Ускорение'] }],
      armorClass: 17,
      armorClassChanges: [],
      conditions: [],
      defenses: [],
      senses: [],
      rolls: [],
      noHealing: [],
      perTurn: [],
      perception: { shift: 0, lines: [] },
    });
    expect(speedTile(10, null, swim)).toEqual({
      value: '10 фт',
      hint: 'Плавание 40 фт',
    });
    expect(speedTile(10, totals(10, { swim: 40 }), swim)).toEqual({
      value: '10 фт',
      hint: 'Плавание 40 фт',
    });
    expect(speedTile(10, totals(20, { swim: 80 }), swim)).toEqual({
      value: '20 фт',
      hint: 'Плавание 80 фт',
      changedBy:
        'В форме 10 фт, Плавание 40 фт.\nУскорение: Скорость вдвое больше.',
    });
  });
});

// Мудрость 12 (+1), Восприятием не владеет: 11; Отравленный — помеха на проверки, −5.
it('пассивное восприятие с помехой от Отравленного и спасброски от смерти', () => {
  const poison = entry('Яд', [{ kind: 'condition', condition: 'poisoned' }]);
  renderWithProviders(
    <CharacterSheet character={sheet([poison])} aside={null} />,
  );
  expect(
    screen.getByLabelText(/^Пассивное восприятие: 6\./),
  ).toHaveAccessibleName(
    'Пассивное восприятие: 6. В форме 11. Отравленный: Помеха: −5.',
  );
  expect(
    screen.getByRole('group', {
      name: 'Спасброски от смерти: успехов 1 из 3, провалов 0 из 3',
    }),
  ).toBeInTheDocument();
});
