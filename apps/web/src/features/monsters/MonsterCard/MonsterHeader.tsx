import { Badge, Group, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import {
  challengeProficiencyBonus,
  formatChallengeXp,
  type Monster,
} from 'shared';
import { formatMonsterKind } from '../monsterKind';
import { formatLairXp } from './monsterCardText';

interface MonsterHeaderProps {
  monster: Monster;
  // Пометка «Скрыт» — только автору: остальные скрытого монстра не видят.
  showHidden: boolean;
  // Кнопки автора — решает страница.
  aside: ReactNode;
}

// Кто это: название, размер и тип, роль, ПО с опытом и бонусом мастерства, автор.
// Звёздочки закладки пока нет — закладки монстров на этапе 7 плана.
function MonsterHeader({ monster, showHidden, aside }: MonsterHeaderProps) {
  const { statBlock } = monster;
  const { challenge } = statBlock;
  return (
    <Stack gap="xs">
      <Title
        order={1}
        style={{
          fontSize: 'min(var(--mantine-h1-font-size), 8vw)',
          overflowWrap: 'anywhere',
        }}
      >
        {monster.name}
      </Title>
      <Text c="dimmed" style={{ overflowWrap: 'anywhere' }}>
        {formatMonsterKind(monster.category, statBlock)}
      </Text>
      {(monster.role === 'unique' || (showHidden && !monster.isPublic)) && (
        <Group gap="xs">
          {monster.role === 'unique' && (
            <Badge color="grape" variant="light">
              Уникальный
            </Badge>
          )}
          {showHidden && !monster.isPublic && (
            <Badge variant="outline" color="gray">
              Скрыт
            </Badge>
          )}
        </Group>
      )}
      <Text size="sm">
        ПО {challenge} · Опыт {formatChallengeXp(challenge)}
        {formatLairXp(statBlock.lairXp)} · Бонус мастерства +
        {challengeProficiencyBonus(challenge)}
      </Text>
      <Text size="sm" c="dimmed">
        Автор: {monster.authorNickname}
      </Text>
      {aside}
    </Stack>
  );
}

export default MonsterHeader;
