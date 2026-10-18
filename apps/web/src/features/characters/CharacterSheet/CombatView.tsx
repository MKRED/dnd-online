import { Paper, SimpleGrid, Text, Tooltip } from '@mantine/core';
import type { Character, SheetTotals } from 'shared';
import {
  formatModifier,
  getAbilityModifier,
} from '../CharacterForm/AbilityScoresSection/abilityMath';
import classes from './CharacterSheet.module.css';
import { armorClassTile } from './sheetArmorClass';
import { speedTile } from './sheetSpeed';

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  // Есть — число изменено эффектами: оно выделено, подсказка объясняет почему.
  changedBy?: string;
}

function StatTile({ label, value, hint, changedBy }: StatTileProps) {
  const tile = (
    <Paper withBorder radius="md" p="xs" ta="center">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text
        fw={700}
        className={classes.statValue}
        c={changedBy ? 'grape' : undefined}
      >
        {value}
        {changedBy && (
          <Text span c="grape" className={classes.changedMark} aria-hidden>
            {' '}
            ●
          </Text>
        )}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Paper>
  );
  if (!changedBy) return tile;
  // На телефоне наведения нет — подсказка открывается и касанием.
  return (
    <Tooltip
      label={changedBy}
      multiline
      maw={280}
      withArrow
      events={{ hover: true, focus: true, touch: true }}
      style={{ whiteSpace: 'pre-line' }}
    >
      <div
        tabIndex={0}
        aria-label={`${label}: ${value}. ${changedBy.replaceAll('\n', ' ')}`}
      >
        {tile}
      </div>
    </Tooltip>
  );
}

interface CombatViewProps {
  character: Character;
  // Итог с эффектами; null — лист «Без эффектов», числа из формы.
  totals: SheetTotals | null;
}

// Боевые числа плитками: их смотрят чаще всего, поэтому они крупно и сразу под шапкой.
// Инициатива не хранится — это модификатор Ловкости (docs/dnd/combat-stats.md).
// Эффекты пересчитывают Класс доспеха и Скорость (docs/plan/done/character-effects.md).
function CombatView({ character, totals }: CombatViewProps) {
  const initiative = getAbilityModifier(character.abilityScores.dexterity);
  const armorClass = armorClassTile(character.armorClass, totals);
  const speed = speedTile(character.speed, totals);
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
      <StatTile label="Класс доспеха" {...armorClass} />
      <StatTile label="Инициатива" value={formatModifier(initiative)} />
      <StatTile label="Скорость" {...speed} />
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
