import { Anchor, CloseButton, Text, UnstyledButton } from '@mantine/core';
import { Link } from 'react-router-dom';
import { canBePrepared, type CharacterAbilityEntry } from 'shared';
import classes from './Abilities.module.css';
import { abilityEntryName, abilitySummary } from './abilitiesView';

export interface AbilityRowHandlers {
  busyId: string | null;
  // Есть — автор отмечает подготовку и убирает строки; нет — только чтение.
  onPrepare?: (entry: CharacterAbilityEntry, prepared: boolean) => void;
  onRemove?: (entry: CharacterAbilityEntry) => void;
}

interface AbilityRowProps extends AbilityRowHandlers {
  entry: CharacterAbilityEntry;
}

// Строка способности: у заклинания 1 круга и выше слева отметка «подготовлено», название
// — ссылка на карточку, под ним или справа — активация и затраты. Скрытая, удалённая
// или не действующая — серая, её можно только убрать.
function AbilityRow({ entry, busyId, onPrepare, onRemove }: AbilityRowProps) {
  const { ability } = entry;
  const name = abilityEntryName(entry);
  const busy = busyId === entry.id;
  const preparable = ability !== null && canBePrepared(ability);

  return (
    <div className={classes.abilityRow} data-busy={busy || undefined}>
      {preparable && (
        <PreparedMark
          prepared={entry.prepared}
          name={name}
          busy={busy}
          onToggle={onPrepare && (() => onPrepare(entry, !entry.prepared))}
        />
      )}
      <div className={classes.abilityText}>
        {ability ? (
          <Anchor
            component={Link}
            to={`/abilities/${ability.id}`}
            size="sm"
            fw={500}
            td={entry.inactive ? 'line-through' : undefined}
            c={entry.inactive ? 'dimmed' : undefined}
            title={
              entry.inactive
                ? 'Вы скрыли эту способность: у персонажа её нет'
                : undefined
            }
          >
            {name}
          </Anchor>
        ) : (
          <Text size="sm" c="dimmed" fs="italic">
            {name}
          </Text>
        )}
        {ability && (
          <Text size="xs" c="dimmed" className={classes.abilitySummary}>
            {abilitySummary(ability)}
          </Text>
        )}
      </div>
      {onRemove && (
        <CloseButton
          size="sm"
          aria-label={`Убрать «${name}»`}
          disabled={busy}
          onClick={() => onRemove(entry)}
        />
      )}
    </div>
  );
}

interface PreparedMarkProps {
  prepared: boolean;
  name: string;
  busy: boolean;
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

export default AbilityRow;
