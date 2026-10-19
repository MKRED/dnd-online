import { Fieldset, Grid, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import type { Monster, MonsterAbilityEntry } from 'shared';
import { EntryImage, SourcesList } from '../../catalog';
import { SheetField } from '../../characters';
import {
  MonsterSkills,
  MonsterSpells,
  monsterSkillGroups,
  monsterSpellGroups,
} from '../Abilities';
import { monstersApi } from '../monstersApi';
import MonsterAbilityScores from './MonsterAbilityScores';
import MonsterHeader from './MonsterHeader';
import MonsterStats from './MonsterStats';
import { monsterTraitRows } from './monsterCardText';

interface MonsterCardProps {
  monster: Monster;
  showHidden: boolean;
  aside: ReactNode;
  // Есть — автор меняет способности на карточке; нет — только чтение.
  onAbilitiesChange?: (abilities: MonsterAbilityEntry[]) => void;
}

// Карточка монстра блоками, как лист персонажа (docs/plan/monsters-npcs.md, «Карточка —
// как лист персонажа»). Снаряжение и эффекты появятся на этапе 6.
function MonsterCard({
  monster,
  showHidden,
  aside,
  onAbilitiesChange,
}: MonsterCardProps) {
  const { statBlock } = monster;
  const abilities = monster.abilities ?? [];
  // Запас легендарных действий и колдовство стоят в заголовках своих групп, а пока групп
  // нет — в «Защите, чувствах, языках».
  const shown = {
    legendary: monsterSkillGroups(abilities, statBlock).some(
      (group) => group.key === 'legendary',
    ),
    spellcasting: monsterSpellGroups(abilities).length > 0,
  };
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
      <MonsterAbilityScores block={statBlock} />
      <Fieldset legend="Защита, чувства, языки">
        <Stack gap={6}>
          {monsterTraitRows(statBlock, shown).map(([label, value]) => (
            <SheetField key={label} label={label}>
              {value}
            </SheetField>
          ))}
        </Stack>
      </Fieldset>
      <MonsterSkills
        monsterId={monster.id}
        abilities={abilities}
        block={statBlock}
        onChange={onAbilitiesChange}
      />
      <MonsterSpells
        monsterId={monster.id}
        abilities={abilities}
        block={statBlock}
        onChange={onAbilitiesChange}
      />
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
