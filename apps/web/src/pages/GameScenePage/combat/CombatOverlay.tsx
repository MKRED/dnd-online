import { CloseButton, Paper, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconEye, IconSwords } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { GameMoveMode } from 'shared';
import classes from './CombatOverlay.module.css';
import { useModeNotice } from './useModeNotice';

interface CombatOverlayProps {
  // null — фигурки ещё не прочитаны.
  mode: GameMoveMode | null;
  round: number | null;
  // Встреча не идёт — игрок только смотрит; null — игра ещё не прочитана.
  watchOnly?: boolean | null;
  // Полоса очерёдности (docs/plan/combat.md, этап 3) — вместо плашки «Бой · раунд N».
  strip?: ReactNode;
  // Слева сверху панель мастера (переключатель «Игра» и «Правка»): полоса её не закрывает.
  tools?: boolean;
}

// Игроку сверху сцены (макет «Режимы хода на сцене», вариант В): в бою — плашка
// «Бой · раунд N», когда мастер начал или закончил бой — уведомление под ней. Вне боя
// плашки нет: ход беречь не нужно. Вне встречи (макет «Сцена вне встречи», вариант А) на
// её месте — «Встреча не идёт · только просмотр»: ходить нельзя, и бой не важен. В бою с
// очерёдностью вместо плашки — полоса портретов, у мастера тоже.
function CombatOverlay({
  mode,
  round,
  watchOnly = null,
  strip = null,
  tools = false,
}: CombatOverlayProps) {
  const { notice, close } = useModeNotice(mode, watchOnly);
  // На телефоне плашка у левого края, рядом со шкалой среза — текст короче (вариант А).
  const narrow = useMediaQuery('(max-width: 48em)');
  const combat = mode === 'tactical' && !watchOnly;
  const shownStrip = watchOnly ? null : strip;
  if (!combat && !watchOnly && !notice && !shownStrip) return null;
  return (
    <div
      className={classes.overlay}
      data-wide={shownStrip ? true : undefined}
      data-tools={tools || undefined}
    >
      {watchOnly && (
        <div
          className={classes.watch}
          role="status"
          title="Встреча не идёт: сцену можно только смотреть"
        >
          <IconEye size={16} />
          {narrow ? 'Только просмотр' : 'Встреча не идёт · только просмотр'}
        </div>
      )}
      {shownStrip}
      {combat && !shownStrip && (
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
