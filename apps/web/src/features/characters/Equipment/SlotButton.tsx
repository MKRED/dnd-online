import { Badge, Box, Group, Text, UnstyledButton } from '@mantine/core';
import { forwardRef } from 'react';
import type { InventoryEntry, InventoryItemCard } from 'shared';
import ItemThumb from '../../items/ItemThumb';
import classes from './Equipment.module.css';

interface SlotButtonProps {
  label: string;
  entry: (InventoryEntry & { item: InventoryItemCard }) | null;
  // Нет — зритель: место только показывает, что надето.
  editable: boolean;
  active?: boolean;
  wide?: boolean;
  onClick?: () => void;
}

// Место куклы: миниатюра вещи (или «+» у пустого), подпись места и название вещи.
// Нажатие открывает выбор, что надеть.
const SlotButton = forwardRef<HTMLButtonElement, SlotButtonProps>(
  function SlotButton({ label, entry, editable, active, wide, onClick }, ref) {
    const name = entry?.item.name;
    return (
      <UnstyledButton
        ref={ref}
        className={wide ? `${classes.slot} ${classes.wide}` : classes.slot}
        data-empty={entry ? undefined : true}
        data-active={active || undefined}
        disabled={!editable}
        aria-label={`${label}: ${name ?? 'пусто'}`}
        aria-haspopup={editable ? 'dialog' : undefined}
        aria-expanded={editable ? Boolean(active) : undefined}
        onClick={onClick}
      >
        {entry ? (
          <Box className={classes.thumb}>
            <ItemThumb item={entry.item} placeholderSize="1rem" />
          </Box>
        ) : (
          <Box className={`${classes.thumb} ${classes.emptyThumb}`}>
            {editable ? '+' : ''}
          </Box>
        )}
        <Box style={{ minWidth: 0 }}>
          <Text size="xs" c="dimmed" lh={1.2}>
            {label}
          </Text>
          <Group gap={4} wrap="wrap">
            <Text
              size="sm"
              fw={entry ? 600 : 400}
              c={entry ? undefined : 'dimmed'}
              lh={1.25}
              lineClamp={2}
            >
              {name ?? 'Пусто'}
            </Text>
            {entry?.attuned && (
              <Badge size="xs" color="grape" variant="light">
                настроен
              </Badge>
            )}
          </Group>
        </Box>
      </UnstyledButton>
    );
  },
);

export default SlotButton;
