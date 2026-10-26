import { CloseButton, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { RecordLink } from '../catalog';
import classes from './AbilityLinks.module.css';
import {
  abilityEntryName,
  abilitySummary,
  type AbilityLinkEntry,
} from './abilityLinkView';

interface AbilityRowProps {
  entry: AbilityLinkEntry;
  busy: boolean;
  // Слева от названия — отметка «подготовлено» у персонажа.
  leading?: ReactNode;
  // Справа, перед крестиком — частота заклинания у монстра.
  trailing?: ReactNode;
  // Есть — владелец убирает строку; нет — только чтение.
  onRemove?: () => void;
  // Подсказка у зачёркнутой строки: способность скрыта от владельца существа.
  inactiveHint: string;
  // Своя строка затрат: у заклинания монстра в ней ещё и круг.
  summary?: string;
}

// Строка способности: название — ссылка на карточку, под ним или справа — активация и
// затраты. Скрытая, удалённая или не действующая — серая, её можно только убрать.
function AbilityRow({
  entry,
  busy,
  leading,
  trailing,
  onRemove,
  inactiveHint,
  summary,
}: AbilityRowProps) {
  const { ability } = entry;
  const name = abilityEntryName(entry);

  return (
    <div className={classes.abilityRow} data-busy={busy || undefined}>
      {leading}
      <div className={classes.abilityText}>
        {ability ? (
          <RecordLink
            kind="ability"
            id={ability.id}
            name={name}
            size="sm"
            fw={500}
            td={entry.inactive ? 'line-through' : undefined}
            c={entry.inactive ? 'dimmed' : undefined}
            title={entry.inactive ? inactiveHint : undefined}
          >
            {name}
          </RecordLink>
        ) : (
          <Text size="sm" c="dimmed" fs="italic">
            {name}
          </Text>
        )}
        {ability && (
          <Text size="xs" c="dimmed" className={classes.abilitySummary}>
            {summary ?? abilitySummary(ability)}
          </Text>
        )}
      </div>
      {trailing}
      {onRemove && (
        <CloseButton
          size="sm"
          aria-label={`Убрать «${name}»`}
          disabled={busy}
          onClick={onRemove}
        />
      )}
    </div>
  );
}

export default AbilityRow;
