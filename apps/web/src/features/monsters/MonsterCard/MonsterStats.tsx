import { SimpleGrid } from '@mantine/core';
import {
  monsterSpecials,
  type MonsterStatBlock,
  type SheetTotals,
} from 'shared';
import { armorClassTile, speedTile, StatTile } from '../../characters';
import { formatHitDice, formatInitiative } from './monsterCardText';

interface MonsterStatsProps {
  block: MonsterStatBlock;
  // Итог с эффектами; null — числа стат-блока, как их ввёл мастер.
  totals: SheetTotals | null;
}

// Боевые числа плитками, как на листе персонажа. Эффекты пересчитывают КД и скорости,
// изменённое выделено, подсказка объясняет почему.
function MonsterStats({ block, totals }: MonsterStatsProps) {
  return (
    // Колонки по ширине блока: в окне карточки на сцене игры узко.
    <SimpleGrid type="container" cols={{ base: 2, '420px': 4 }} spacing="xs">
      <StatTile
        label="Класс доспеха"
        {...armorClassTile(block.armorClass, totals)}
      />
      <StatTile label="Инициатива" value={formatInitiative(block.initiative)} />
      <StatTile
        label="Хиты"
        value={String(block.hitPoints.average)}
        hint={formatHitDice(block.hitPoints)}
      />
      <StatTile
        label="Скорость"
        {...speedTile(block.speed.walk, totals, monsterSpecials(block.speed))}
      />
    </SimpleGrid>
  );
}

export default MonsterStats;
