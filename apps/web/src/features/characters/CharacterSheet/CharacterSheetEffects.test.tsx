import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Character, CharacterEffectEntry, EffectComponent } from 'shared';
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
      'Скорость: 60 фт. Без эффектов 30 фт. Ускорение: Скорость вдвое больше. Крылья: Скорость полёта 60 фт., может парить.',
    );
    expect(within(tile).getByText('Полёт 120 фт, парит')).toBeInTheDocument();
    expect(screen.getByText('Тёмное зрение, 60 фт.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Без эффектов' }));
    expect(screen.queryByLabelText(/^Скорость: /)).toBeNull();
    expect(speedTileText()).toBe('Скорость30 фт');
    expect(screen.queryByText('Тёмное зрение, 60 фт.')).toBeNull();
  });
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
    'Класс доспеха: 17. Без эффектов 15. Щит веры: КД +2. Доспехи мага: Базовый КД 13 + модификатор Ловкости.',
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
    screen.getByLabelText(/^Класс доспеха: 15\. Без эффектов 15\./),
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
    };
    expect(speedTile(30, totals)).toEqual({ value: '30 фт' });
    expect(speedTile(30, null)).toEqual({ value: '30 фт' });
    expect(armorClassTile(15, totals)).toEqual({ value: '15' });
  });
});
