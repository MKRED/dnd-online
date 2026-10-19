import { Fieldset, Grid, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import type { Monster } from 'shared';
import { EntryImage, SourcesList } from '../../catalog';
import { SheetField } from '../../characters';
import {
  MonsterSkills,
  MonsterSpells,
  monsterSkillGroups,
  monsterSpellGroups,
} from '../Abilities';
import { MonsterGear } from '../Gear';
import { monstersApi } from '../monstersApi';
import MonsterAbilityScores from './MonsterAbilityScores';
import MonsterTop from './MonsterTop';
import { monsterTraitRows } from './monsterCardText';

// Что карточка меняет на месте: строки, которые сервер отдал после правки.
export type MonsterLinksPatch = Partial<
  Pick<Monster, 'abilities' | 'items' | 'effects'>
>;

interface MonsterCardProps {
  monster: Monster;
  showHidden: boolean;
  aside: ReactNode;
  // Есть — автор меняет способности, снаряжение и эффекты на карточке; нет — только
  // чтение.
  onLinksChange?: (patch: MonsterLinksPatch) => void;
}

// Карточка монстра блоками, как лист персонажа (docs/plan/monsters-npcs.md, «Карточка —
// как лист персонажа»).
function MonsterCard({
  monster,
  showHidden,
  aside,
  onLinksChange,
}: MonsterCardProps) {
  const onAbilitiesChange =
    onLinksChange &&
    ((abilities: MonsterLinksPatch['abilities']) =>
      onLinksChange({ abilities }));
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
          <MonsterTop
            monster={monster}
            showHidden={showHidden}
            aside={aside}
            onEffectsChange={
              onLinksChange && ((effects) => onLinksChange({ effects }))
            }
          />
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
      <MonsterGear
        monsterId={monster.id}
        items={monster.items ?? []}
        onChange={onLinksChange && ((items) => onLinksChange({ items }))}
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
