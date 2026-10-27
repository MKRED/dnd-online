import { ActionIcon, Paper, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowBackUp, IconArrowForwardUp } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import {
  EDITOR_TOOLS,
  stripTool,
  TOOL_LABELS,
  type EditorTool,
} from '../editorTools';
import { TOOL_ICONS } from '../toolIcons';
import classes from './SceneToolbar.module.css';

interface SceneToolbarProps {
  // Инструменты на полосе, по порядку; без него — все. Номер клавиши — место в полосе.
  // Пустой список — полосы нет (сцена игры в режиме «Игра»).
  tools?: readonly EditorTool[];
  tool: EditorTool;
  onTool: (tool: EditorTool) => void;
  busy: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // Кнопки отмены и возврата; без него — есть. В «Игре» сцены их нет: отменяют в «Правке».
  history?: boolean;
  // Что стоит слева от отмены и возврата (переключатель режима на сцене игры).
  leading?: ReactNode;
}

// Полоса инструментов поверх сцены: на компьютере — столбцом слева, на телефоне —
// строкой внизу, под большим пальцем. Отмена и возврат — в верхнем левом углу
// (docs/plan/done/map-editor.md, «Панель: полоса инструментов на сцене»).
function SceneToolbar({
  tools = EDITOR_TOOLS,
  tool,
  onTool,
  busy,
  onUndo,
  onRedo,
  history = true,
  leading,
}: SceneToolbarProps) {
  // Та же граница, что у страницы: на ней правая панель уходит под сцену.
  const narrow = useMediaQuery('(max-width: 48em)');
  const tooltipSide = narrow ? 'top' : 'right';

  return (
    <>
      {tools.length > 0 && (
        <Paper className={classes.tools} withBorder shadow="xs" p={4}>
          <ActionIcon.Group orientation={narrow ? 'horizontal' : 'vertical'}>
            {tools.map((value, index) => {
              const Icon = TOOL_ICONS[value];
              // Режим «Строить» («Область», «Коробка») — та же кнопка.
              const active = stripTool(tool) === value;
              return (
                <Tooltip
                  key={value}
                  // Клавиша ластика и «Строить» при нём же переключает режим (useMapEditor).
                  label={`${TOOL_LABELS[value]} (${index + 1}${value === 'erase' || value === 'place' ? ', ещё раз — режим' : ''})`}
                  position={tooltipSide}
                  withArrow
                  // На касание подсказка всплывала и не уходила.
                  disabled={narrow}
                >
                  <ActionIcon
                    size="lg"
                    variant={active ? 'filled' : 'default'}
                    aria-label={TOOL_LABELS[value]}
                    aria-pressed={active}
                    onClick={() => onTool(value)}
                  >
                    <Icon size={20} stroke={1.75} />
                  </ActionIcon>
                </Tooltip>
              );
            })}
          </ActionIcon.Group>
        </Paper>
      )}

      {(history || leading) && (
        <div className={classes.history}>
          {leading}
          {history && (
            <Paper withBorder shadow="xs" p={4}>
              <ActionIcon.Group>
                <Tooltip label="Отменить (Ctrl+Z)" withArrow disabled={narrow}>
                  <ActionIcon
                    size="lg"
                    variant="default"
                    aria-label="Отменить"
                    disabled={busy}
                    onClick={onUndo}
                  >
                    <IconArrowBackUp size={20} stroke={1.75} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip
                  label="Вернуть (Ctrl+Shift+Z)"
                  withArrow
                  disabled={narrow}
                >
                  <ActionIcon
                    size="lg"
                    variant="default"
                    aria-label="Вернуть"
                    disabled={busy}
                    onClick={onRedo}
                  >
                    <IconArrowForwardUp size={20} stroke={1.75} />
                  </ActionIcon>
                </Tooltip>
              </ActionIcon.Group>
            </Paper>
          )}
        </div>
      )}
    </>
  );
}

export default SceneToolbar;
