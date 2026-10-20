import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconRefresh, IconRun } from '@tabler/icons-react';
import { movementLeft, type GameFigure, type GameFigures } from 'shared';
import classes from '../GameScenePage.module.css';
import type { FigureTool } from './useFigureTool';

interface FiguresPanelProps {
  figures: GameFigures;
  master: boolean;
  tool: FigureTool;
}

function allowance(figure: GameFigure) {
  const total = figure.speed * (1 + figure.dashes);
  return `${movementLeft(figure)} из ${total} фт`;
}

// Фигурки сцены в панели (docs/plan/game.md, этап 7): чья, сколько осталось движения,
// выбор фигурки, у мастера — запас и «Не на сцене». Выбор — и щелчком по самой фигурке.
function FiguresPanel({ figures, master, tool }: FiguresPanelProps) {
  const { busy } = tool;
  const toggle = (id: string) =>
    tool.select(tool.selectedId === id ? null : id);
  const hint = tool.placing
    ? `Щёлкните клетку, куда поставить: ${tool.placing.name}.`
    : tool.figure
      ? master
        ? 'Щёлкните клетку, где фигурка может стоять: мастер ставит без пути и запаса. Esc — снять выбор.'
        : 'Щёлкните подсвеченную клетку — фигурка пойдёт туда. Esc — снять выбор.'
      : 'Выберите фигурку — щелчком по ней или по имени.';

  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="nowrap">
        <Text fw={600} size="sm">
          Фигурки
        </Text>
        {master && figures.figures.length > 0 && (
          <Tooltip label="Запас движения всех фигурок снова полный">
            <Button
              size="compact-xs"
              variant="light"
              onClick={tool.round}
              disabled={busy}
            >
              Новый раунд
            </Button>
          </Tooltip>
        )}
      </Group>
      {figures.figures.length === 0 && figures.unplaced.length === 0 && (
        <Text size="xs" c="dimmed">
          На сцене нет фигурок: персонажи встают на стартовые точки, когда
          садятся на места.
        </Text>
      )}
      {figures.figures.map((figure) => {
        const id = figure.character.id;
        const selectable = figure.canMove;
        return (
          <Group key={id} gap={4} wrap="nowrap">
            <UnstyledButton
              className={classes.figureRow}
              data-selected={tool.selectedId === id || undefined}
              disabled={!selectable}
              onClick={() => toggle(id)}
              aria-pressed={selectable ? tool.selectedId === id : undefined}
            >
              <Text size="sm" truncate>
                {figure.character.name}
              </Text>
              <Text size="xs" c="dimmed">
                Осталось {allowance(figure)}
              </Text>
            </UnstyledButton>
            {master && (
              <>
                <Tooltip label="Обновить запас: новый ход">
                  <ActionIcon
                    variant="subtle"
                    aria-label={`Обновить запас: ${figure.character.name}`}
                    disabled={busy}
                    onClick={() => tool.allowance(id, 'refresh')}
                  >
                    <IconRefresh size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Рывок: ещё одна Скорость на этот ход">
                  <ActionIcon
                    variant="subtle"
                    aria-label={`Рывок: ${figure.character.name}`}
                    disabled={busy}
                    onClick={() => tool.allowance(id, 'dash')}
                  >
                    <IconRun size={16} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}
          </Group>
        );
      })}
      {master && figures.unplaced.length > 0 && (
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            Не на сцене — не хватило стартовой точки:
          </Text>
          {figures.unplaced.map((character) => (
            <Group key={character.id} justify="space-between" wrap="nowrap">
              <Text size="sm" truncate>
                {character.name}
              </Text>
              <Button
                size="compact-xs"
                variant={tool.selectedId === character.id ? 'filled' : 'light'}
                onClick={() => toggle(character.id)}
              >
                Поставить
              </Button>
            </Group>
          ))}
        </Stack>
      )}
      <Text size="xs" c="dimmed">
        {hint}
      </Text>
      {tool.error && <Alert color="red">{tool.error}</Alert>}
    </Stack>
  );
}

export default FiguresPanel;
