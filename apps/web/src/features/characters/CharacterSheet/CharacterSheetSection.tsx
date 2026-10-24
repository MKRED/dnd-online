import { Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { sheetTotals, type Character } from 'shared';
import CharacterAbilities from '../Abilities';
import InventorySection from '../Inventory';
import AbilitiesView from './AbilitiesView';
import CombatView from './CombatView';
import EffectSummary from './EffectSummary';
import ProficienciesView from './ProficienciesView';

// Разделы листа для вкладок окна карточки на сцене игры (docs/plan/scene-page.md, этап 4).
export type SheetSection = 'stats' | 'abilities' | 'effects' | 'gear';

interface CharacterSheetSectionProps {
  character: Character;
  section: SheetSection;
}

// Часть листа персонажа или НПС, только для чтения: правки идут через состояние в
// шапке окна. Числа — итог с эффектами, как лист открывается в игре.
function CharacterSheetSection({
  character,
  section,
}: CharacterSheetSectionProps) {
  const totals = useMemo(() => sheetTotals(character), [character]);
  const withEffects = character.effects.length > 0 ? totals : null;
  switch (section) {
    case 'stats':
      return (
        <Stack gap="md">
          <CombatView character={character} totals={withEffects} />
          <AbilitiesView character={character} />
          <ProficienciesView character={character} />
        </Stack>
      );
    case 'abilities':
      return <CharacterAbilities character={character} />;
    case 'effects':
      return withEffects ? (
        <EffectSummary totals={withEffects} />
      ) : (
        <Text size="sm" c="dimmed">
          Эффектов нет.
        </Text>
      );
    case 'gear':
      return <InventorySection character={character} />;
  }
}

export default CharacterSheetSection;
