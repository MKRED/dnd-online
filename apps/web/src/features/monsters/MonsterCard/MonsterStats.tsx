import { SimpleGrid } from '@mantine/core';
import type { MonsterStatBlock } from 'shared';
import { StatTile } from '../../characters';
import {
  formatHitDice,
  formatInitiative,
  formatSpecialSpeeds,
} from './monsterCardText';

// Боевые числа плитками, как на листе персонажа. Эффектов у монстра пока нет — числа из
// формы (итог с эффектами — этап 6 плана).
function MonsterStats({ block }: { block: MonsterStatBlock }) {
  return (
    <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="xs">
      <StatTile label="Класс доспеха" value={String(block.armorClass)} />
      <StatTile label="Инициатива" value={formatInitiative(block.initiative)} />
      <StatTile
        label="Хиты"
        value={String(block.hitPoints.average)}
        hint={formatHitDice(block.hitPoints)}
      />
      <StatTile
        label="Скорость"
        value={`${block.speed.walk} фт`}
        hint={formatSpecialSpeeds(block.speed)}
      />
    </SimpleGrid>
  );
}

export default MonsterStats;
