import { Button, Text } from '@mantine/core';
import { IconDroplet } from '@tabler/icons-react';
import type { PendingDamage as Pending } from 'shared';
import classes from './TurnPanel.module.css';

interface PendingDamageProps {
  pending: Pending;
  onRoll: () => void;
}

// Попадание без брошенного урона (окно закрыли или страницу обновили): пока урон не
// брошен, новой атаки и конца хода нет — кнопка вернёт окно на шаг урона.
function PendingDamage({ pending, onRoll }: PendingDamageProps) {
  return (
    <div className={classes.pending} role="status">
      <Text size="xs">
        {pending.critical ? 'Крит' : 'Попадание'}: {pending.name} →{' '}
        {pending.target.name}
      </Text>
      <Button
        size="xs"
        color="red"
        leftSection={<IconDroplet size={14} />}
        onClick={onRoll}
      >
        Бросить урон
      </Button>
    </div>
  );
}

export default PendingDamage;
