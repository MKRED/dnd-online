import { Paper, SimpleGrid, Text } from '@mantine/core';
import type { Character } from 'shared';
import {
  formatModifier,
  getAbilityModifier,
} from '../CharacterForm/AbilityScoresSection/abilityMath';
import classes from './CharacterSheet.module.css';

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
}

function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <Paper withBorder radius="md" p="xs" ta="center">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} className={classes.statValue}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Paper>
  );
}

// Боевые числа плитками: их смотрят чаще всего, поэтому они крупно и сразу под шапкой.
// Инициатива не хранится — это модификатор Ловкости (docs/dnd/combat-stats.md).
function CombatView({ character }: { character: Character }) {
  const initiative = getAbilityModifier(character.abilityScores.dexterity);
  return (
    <SimpleGrid cols={3} spacing="xs">
      <StatTile
        label="ХП"
        value={`${character.hitPointsCurrent}/${character.hitPointsMax}`}
        hint={
          character.hitPointsTemp > 0
            ? `+${character.hitPointsTemp} временных`
            : undefined
        }
      />
      <StatTile label="Класс доспеха" value={String(character.armorClass)} />
      <StatTile label="Инициатива" value={formatModifier(initiative)} />
      <StatTile label="Скорость" value={`${character.speed} фт`} />
      <StatTile
        label="Бонус мастерства"
        value={formatModifier(character.proficiencyBonus)}
      />
      <StatTile
        label="Кость хитов"
        value={character.hitDie ? `к${character.hitDie}` : '—'}
      />
    </SimpleGrid>
  );
}

export default CombatView;
