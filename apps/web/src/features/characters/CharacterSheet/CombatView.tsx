import { SimpleGrid } from '@mantine/core';
import type { Character, SheetTotals } from 'shared';
import {
  formatModifier,
  getAbilityModifier,
} from '../CharacterForm/AbilityScoresSection/abilityMath';
import DeathSavesTile from './DeathSavesTile';
import { armorClassTile } from './sheetArmorClass';
import { perceptionTile } from './sheetPerception';
import { speedTile } from './sheetSpeed';
import StatTile from './StatTile';

interface CombatViewProps {
  character: Character;
  // Итог с эффектами; null — лист «Без эффектов», числа из формы.
  totals: SheetTotals | null;
}

// Боевые числа плитками: их смотрят чаще всего, поэтому они крупно и сразу под шапкой.
// Инициатива не хранится — это модификатор Ловкости (docs/dnd/combat-stats.md).
// Эффекты пересчитывают Класс доспеха, Скорость и пассивное восприятие
// (docs/plan/done/character-effects.md).
function CombatView({ character, totals }: CombatViewProps) {
  const initiative = getAbilityModifier(character.abilityScores.dexterity);
  const armorClass = armorClassTile(character.armorClass, totals);
  const speed = speedTile(character.speed, totals);
  const perception = perceptionTile(character, totals);
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
      <StatTile label="Пассивное восприятие" {...perception} />
      <DeathSavesTile
        successes={character.deathSaveSuccesses}
        failures={character.deathSaveFailures}
      />
    </SimpleGrid>
  );
}

export default CombatView;
