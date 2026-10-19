import { Fieldset, Grid, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import type { Monster } from 'shared';
import { EntryImage, SourcesList } from '../../catalog';
import { SheetField } from '../../characters';
import { monstersApi } from '../monstersApi';
import MonsterAbilities from './MonsterAbilities';
import MonsterHeader from './MonsterHeader';
import MonsterStats from './MonsterStats';
import { monsterTraitRows } from './monsterCardText';

interface MonsterCardProps {
  monster: Monster;
  showHidden: boolean;
  aside: ReactNode;
}

// Карточка монстра блоками, как лист персонажа (docs/plan/monsters-npcs.md, «Карточка —
// как лист персонажа»). Способности, снаряжение и эффекты появятся на этапах 5–6.
function MonsterCard({ monster, showHidden, aside }: MonsterCardProps) {
  const { statBlock } = monster;
  return (
    <Stack gap="lg">
      <Grid gap="xl">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <EntryImage entry={monster} imagePath={monstersApi.imagePath} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 8 }}>
          <Stack gap="md">
            <MonsterHeader
              monster={monster}
              showHidden={showHidden}
              aside={aside}
            />
            <MonsterStats block={statBlock} />
          </Stack>
        </Grid.Col>
      </Grid>
      <MonsterAbilities block={statBlock} />
      <Fieldset legend="Защита, чувства, языки">
        <Stack gap={6}>
          {monsterTraitRows(statBlock).map(([label, value]) => (
            <SheetField key={label} label={label}>
              {value}
            </SheetField>
          ))}
        </Stack>
      </Fieldset>
      {monster.description && (
        <Fieldset legend="Описание">
          <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {monster.description}
          </Text>
        </Fieldset>
      )}
      <SourcesList sources={monster.sources} />
    </Stack>
  );
}

export default MonsterCard;
