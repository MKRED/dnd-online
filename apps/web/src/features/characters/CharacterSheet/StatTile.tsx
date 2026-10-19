import { Paper, Text, Tooltip } from '@mantine/core';
import classes from './CharacterSheet.module.css';

// Плитка числа листа: подпись, крупное значение, под ним пояснение. Её же берёт карточка
// монстра.
interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  // Есть — число изменено эффектами: оно выделено, подсказка объясняет почему.
  changedBy?: string;
}

function StatTile({ label, value, hint, changedBy }: StatTileProps) {
  const tile = (
    <Paper withBorder radius="md" p="xs" ta="center">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text
        fw={700}
        className={classes.statValue}
        c={changedBy ? 'grape' : undefined}
      >
        {value}
        {changedBy && (
          <Text span c="grape" className={classes.changedMark} aria-hidden>
            {' '}
            ●
          </Text>
        )}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Paper>
  );
  if (!changedBy) return tile;
  // На телефоне наведения нет — подсказка открывается и касанием.
  return (
    <Tooltip
      label={changedBy}
      multiline
      maw={280}
      withArrow
      events={{ hover: true, focus: true, touch: true }}
      style={{ whiteSpace: 'pre-line' }}
    >
      <div
        tabIndex={0}
        aria-label={`${label}: ${value}. ${changedBy.replaceAll('\n', ' ')}`}
      >
        {tile}
      </div>
    </Tooltip>
  );
}

export default StatTile;
