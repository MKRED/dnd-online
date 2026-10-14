import { Grid, Stack } from '@mantine/core';
import type { ReactNode } from 'react';
import type { Character } from 'shared';
import AbilitiesView from './AbilitiesView';
import BelongingsView, { PersonalityView } from './BelongingsView';
import CombatView from './CombatView';
import ProficienciesView from './ProficienciesView';
import SheetHeader from './SheetHeader';
import SheetImages from './SheetImages';

interface CharacterSheetProps {
  character: Character;
  aside: ReactNode;
}

// Лист персонажа только для чтения — так его видят и автор, и зритель по ссылке.
// Разделы идут в порядке формы, пустые не показываются.
function CharacterSheet({ character, aside }: CharacterSheetProps) {
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
      <BelongingsView character={character} />
      <PersonalityView character={character} />
    </Stack>
  );
}

export default CharacterSheet;
