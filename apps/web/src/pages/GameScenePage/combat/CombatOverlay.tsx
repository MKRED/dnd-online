import { CloseButton, Paper, Text } from '@mantine/core';
import { IconSwords } from '@tabler/icons-react';
import type { GameMoveMode } from 'shared';
import classes from './CombatOverlay.module.css';
import { useModeNotice } from './useModeNotice';

interface CombatOverlayProps {
  // null — фигурки ещё не прочитаны.
  mode: GameMoveMode | null;
  round: number | null;
}

// Игроку сверху сцены (макет «Режимы хода на сцене», вариант В): в бою — плашка
// «Бой · раунд N», когда мастер начал или закончил бой — уведомление под ней. Вне боя
// плашки нет: ход беречь не нужно.
function CombatOverlay({ mode, round }: CombatOverlayProps) {
  const { notice, close } = useModeNotice(mode);
  if (mode !== 'tactical' && !notice) return null;
  return (
    <div className={classes.overlay}>
      {mode === 'tactical' && (
        <div className={classes.banner} role="status">
          <IconSwords size={16} />
          Бой · раунд {round ?? 1}
        </div>
      )}
      {notice && (
        <Paper
          className={classes.notice}
          withBorder
          shadow="md"
          role="alert"
          aria-label={notice.title}
        >
          <div>
            <Text size="sm" fw={600}>
              {notice.title}
            </Text>
            <Text size="sm" c="dimmed">
              {notice.text}
            </Text>
          </div>
          <CloseButton size="sm" aria-label="Скрыть" onClick={close} />
        </Paper>
      )}
    </div>
  );
}

export default CombatOverlay;
