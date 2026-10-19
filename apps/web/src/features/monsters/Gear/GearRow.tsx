import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Group,
  Menu,
  Text,
} from '@mantine/core';
import { Link } from 'react-router-dom';
import type { MonsterItemEntry } from 'shared';
import ItemThumb from '../../items/ItemThumb';
import { gearEntryName } from './gearView';

interface GearRowProps {
  entry: MonsterItemEntry;
  busy: boolean;
  // Есть — автор меняет количество и убирает строку; нет — только чтение.
  onEditQuantity?: () => void;
  onRemove?: () => void;
}

// Строка снаряжения: миниатюра, название — ссылка на карточку предмета, количество, у
// автора — меню. Скрытый или удалённый предмет — серая строка, её можно только убрать.
// Веса нет: груз монстра приложение не считает.
function GearRow({ entry, busy, onEditQuantity, onRemove }: GearRowProps) {
  const { item } = entry;
  const name = gearEntryName(entry);
  return (
    <Group gap="sm" wrap="nowrap" opacity={busy ? 0.6 : 1}>
      <Box w={32} style={{ flexShrink: 0 }}>
        <ItemThumb
          item={{
            id: item?.id ?? entry.id,
            name: item?.name ?? '?',
            image: item?.image ?? null,
          }}
          placeholderSize="0.9rem"
        />
      </Box>
      <Box style={{ flex: 1, minWidth: 0 }}>
        {item ? (
          <Anchor
            component={Link}
            to={`/items/${item.id}`}
            size="sm"
            lineClamp={2}
            td={entry.inactive ? 'line-through' : undefined}
            c={entry.inactive ? 'dimmed' : undefined}
            title={
              entry.inactive
                ? 'Вы скрыли этот предмет: у монстра его нет'
                : undefined
            }
          >
            {name}
          </Anchor>
        ) : (
          <Text size="sm" c="dimmed" fs="italic" lineClamp={2}>
            {name}
          </Text>
        )}
      </Box>
      <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
        ×{entry.quantity}
      </Text>
      {onRemove &&
        (item && onEditQuantity ? (
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Ещё: ${name}`}
                disabled={busy}
              >
                ⋯
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={onEditQuantity}>
                Изменить количество
              </Menu.Item>
              <Menu.Item color="red" onClick={onRemove}>
                Убрать из снаряжения
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        ) : (
          <Button
            size="compact-sm"
            variant="light"
            color="red"
            loading={busy}
            onClick={onRemove}
          >
            Убрать
          </Button>
        ))}
    </Group>
  );
}

export default GearRow;
