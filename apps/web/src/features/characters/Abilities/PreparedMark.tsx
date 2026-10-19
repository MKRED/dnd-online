import { UnstyledButton } from '@mantine/core';
import classes from './Abilities.module.css';

interface PreparedMarkProps {
  prepared: boolean;
  name: string;
  busy: boolean;
  // Есть — автор отмечает подготовку; нет — только чтение.
  onToggle?: () => void;
}

// Как кружок ячейки, но меньше: заполнен — заклинание подготовлено.
function PreparedMark({ prepared, name, busy, onToggle }: PreparedMarkProps) {
  const dot = (
    <span className={classes.preparedDot} data-full={prepared || undefined} />
  );
  if (!onToggle) {
    return (
      <span
        className={classes.preparedCell}
        role="img"
        aria-label={prepared ? 'Подготовлено' : 'Не подготовлено'}
      >
        {dot}
      </span>
    );
  }
  return (
    <UnstyledButton
      className={classes.preparedButton}
      aria-pressed={prepared}
      aria-label={`«${name}» подготовлено`}
      title={
        prepared ? 'Подготовлено — снять отметку' : 'Отметить подготовленным'
      }
      disabled={busy}
      onClick={onToggle}
    >
      {dot}
    </UnstyledButton>
  );
}

export default PreparedMark;
