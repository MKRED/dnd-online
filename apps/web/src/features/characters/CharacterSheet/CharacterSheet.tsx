import { Grid, Stack } from '@mantine/core';
import type { ReactNode } from 'react';
import type { Character, InventoryEntry } from 'shared';
import AbilitiesView from './AbilitiesView';
import CombatView from './CombatView';
import InventorySection from '../Inventory';
import PersonalityView from './PersonalityView';
import ProficienciesView from './ProficienciesView';
import SheetHeader from './SheetHeader';
import SheetImages from './SheetImages';

interface CharacterSheetProps {
  character: Character;
  aside: ReactNode;
  // Есть — автор меняет инвентарь прямо на листе; нет — лист только для чтения.
  onInventoryChange?: (inventory: InventoryEntry[]) => void;
}

// Лист персонажа — так его видят и автор, и зритель по ссылке. Менять на листе можно
// только инвентарь (у автора); остальное — формой.
// Разделы идут в порядке формы, пустые не показываются.
function CharacterSheet({
  character,
  aside,
  onInventoryChange,
}: CharacterSheetProps) {
  return (
    <Stack gap="lg">
      <Grid gap="xl">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <SheetImages
            characterId={character.id}
            characterName={character.name}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 8 }}>
          <Stack gap="md">
            <SheetHeader character={character} aside={aside} />
            <CombatView character={character} />
          </Stack>
        </Grid.Col>
      </Grid>
      <AbilitiesView character={character} />
      <ProficienciesView character={character} />
      <InventorySection character={character} onChange={onInventoryChange} />
      <PersonalityView character={character} />
    </Stack>
  );
}

export default CharacterSheet;
