import { ActionIcon, Paper, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowBackUp, IconArrowForwardUp } from '@tabler/icons-react';
import { EDITOR_TOOLS, TOOL_LABELS, type EditorTool } from '../editorTools';
import { TOOL_ICONS } from '../toolIcons';
import classes from './SceneToolbar.module.css';

interface SceneToolbarProps {
  // Инструменты на полосе, по порядку; без него — все. Номер клавиши — место в полосе.
  tools?: readonly EditorTool[];
  tool: EditorTool;
  onTool: (tool: EditorTool) => void;
  busy: boolean;
  onUndo: () => void;
  onRedo: () => void;
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
}: SceneToolbarProps) {
  // Та же граница, что у страницы: на ней правая панель уходит под сцену.
  const narrow = useMediaQuery('(max-width: 48em)');
  const tooltipSide = narrow ? 'top' : 'right';

  return (
    <>
      <Paper className={classes.tools} withBorder shadow="xs" p={4}>
        <ActionIcon.Group orientation={narrow ? 'horizontal' : 'vertical'}>
          {tools.map((value, index) => {
            const Icon = TOOL_ICONS[value];
            return (
              <Tooltip
                key={value}
                // Клавиша ластика при ластике переключает его режим (useMapEditor).
                label={`${TOOL_LABELS[value]} (${index + 1}${value === 'erase' ? ', ещё раз — режим' : ''})`}
                position={tooltipSide}
                withArrow
              >
                <ActionIcon
                  size="lg"
                  variant={tool === value ? 'filled' : 'default'}
                  aria-label={TOOL_LABELS[value]}
                  aria-pressed={tool === value}
                  onClick={() => onTool(value)}
                >
                  <Icon size={20} stroke={1.75} />
                </ActionIcon>
              </Tooltip>
            );
          })}
        </ActionIcon.Group>
      </Paper>

      <Paper className={classes.history} withBorder shadow="xs" p={4}>
        <ActionIcon.Group>
          <Tooltip label="Отменить (Ctrl+Z)" withArrow>
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
          <Tooltip label="Вернуть (Ctrl+Shift+Z)" withArrow>
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
    </>
  );
}

export default SceneToolbar;
