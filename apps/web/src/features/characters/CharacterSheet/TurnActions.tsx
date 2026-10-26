import { Group, Text } from '@mantine/core';
import { pluralRu, type Character } from 'shared';
import classes from './TurnActions.module.css';

// Строка «За ход» над «Атаками» (вариант В, выбран пользователем 2026-10-26): база из
// формы, по книге у всех по одному. Значки как в BG3, со словами рядом, чтобы их не надо
// было запоминать; в бою потраченное будет гаснуть (docs/dnd/ability-usage.md).
const TURN_ACTIONS = [
  {
    key: 'actionCount',
    shape: classes.action,
    forms: ['действие', 'действия', 'действий'],
  },
  {
    key: 'bonusActionCount',
    shape: classes.bonus,
    forms: ['бонусное', 'бонусных', 'бонусных'],
  },
  {
    key: 'reactionCount',
    shape: classes.reaction,
    forms: ['реакция', 'реакции', 'реакций'],
  },
] as const;

function TurnActions({ character }: { character: Character }) {
  return (
    <Group className={classes.strip} role="group" aria-label="За ход">
      <Text size="xs" c="dimmed">
        За ход
      </Text>
      {TURN_ACTIONS.map(({ key, shape, forms }) => {
        const count = character[key];
        return (
          <Group key={key} gap={6} wrap="nowrap">
            <span className={`${classes.icon} ${shape}`} aria-hidden />
            <Text size="sm">
              {count} {pluralRu(count, forms)}
            </Text>
          </Group>
        );
      })}
    </Group>
  );
}

export default TurnActions;
