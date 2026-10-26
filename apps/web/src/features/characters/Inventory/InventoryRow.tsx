import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Text,
  Tooltip,
} from '@mantine/core';
import { RecordLink } from '../../catalog';
import type { InventoryEntry } from 'shared';
import { SLOT_FULL_NAMES } from '../Equipment/equipmentView';
import EquipMenuItems from './EquipMenuItems';
import type { EquipHandlers } from './equipHandlers';
import { formatWeight } from '../../items/itemLabels';
import ItemThumb from '../../items/ItemThumb';
import { entryName, entryWeight, MOVE_LABELS } from './inventoryView';

interface InventoryRowProps {
  entry: InventoryEntry;
  // Действия — только у автора персонажа; зритель по ссылке видит строку как есть.
  editable: boolean;
  busy: boolean;
  onMove: () => void;
  onEditQuantity: () => void;
  onRemove: () => void;
  // Весь инвентарь — чтобы меню знало, что надето на места.
  inventory: InventoryEntry[];
  equipHandlers: EquipHandlers;
}

// Строка инвентаря: миниатюра, название (ссылка на карточку), количество, вес строки,
// справа — перенос ⇄ и меню. Скрытый или удалённый автором предмет — серая строка,
// которую можно только убрать.
function InventoryRow({
  entry,
  editable,
  busy,
  onMove,
  onEditQuantity,
  onRemove,
  inventory,
  equipHandlers,
}: InventoryRowProps) {
  const { item } = entry;
  const name = entryName(entry);
  // Скрытый от владельца предмет, который видит его автор: в груз не входит.
  const inactive = item !== null && entry.inactive;
  const weight = item ? formatWeight(entryWeight(entry)) : '—';
  const numbers = item
    ? `×${entry.quantity} · ${weight}`
    : `×${entry.quantity}`;

  return (
    <Group gap="sm" wrap="nowrap">
      <Box w={36} style={{ flexShrink: 0 }}>
        <ItemThumb
          item={{
            id: item?.id ?? entry.id,
            name: item?.name ?? '?',
            image: item?.image ?? null,
          }}
          placeholderSize="1rem"
        />
      </Box>
      <Box style={{ flex: 1, minWidth: 0 }}>
        {item ? (
          <RecordLink
            kind="item"
            id={item.id}
            name={name}
            size="sm"
            display="block"
            lineClamp={2}
          >
            {name}
          </RecordLink>
        ) : (
          <Text size="sm" c="dimmed" fs="italic" lineClamp={2}>
            {name}
          </Text>
        )}
        {(entry.equipped.length > 0 || entry.attuned) && (
          <Group gap={4} mt={2}>
            {entry.equipped.length > 0 && (
              <Badge size="xs" variant="light" color="green">
                Надето ·{' '}
                {entry.equipped.map((s) => SLOT_FULL_NAMES[s]).join('; ')}
              </Badge>
            )}
            {entry.attuned && (
              <Badge size="xs" variant="light" color="grape">
                Настроен
              </Badge>
            )}
          </Group>
        )}
        {inactive && (
          <Tooltip
            label="Вы скрыли этот предмет: на персонажа он не действует и в груз не входит"
            multiline
            w={260}
          >
            <Badge size="xs" variant="outline" color="gray">
              Не действует
            </Badge>
          </Tooltip>
        )}
        {/* На узком экране числа уходят под название: иначе на него не остаётся места. */}
        <Text size="xs" c="dimmed" hiddenFrom="sm">
          {numbers}
        </Text>
      </Box>
      <Text size="sm" c="dimmed" visibleFrom="sm" style={{ flexShrink: 0 }}>
        ×{entry.quantity}
      </Text>
      <Text
        size="sm"
        w={72}
        ta="right"
        c={inactive ? 'dimmed' : undefined}
        visibleFrom="sm"
        style={{ flexShrink: 0 }}
      >
        {weight}
      </Text>
      {editable &&
        (item ? (
          <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
            <Tooltip label={MOVE_LABELS[entry.location]}>
              <ActionIcon
                variant="default"
                aria-label={`${MOVE_LABELS[entry.location]}: ${name}`}
                loading={busy}
                onClick={onMove}
              >
                ⇄
              </ActionIcon>
            </Tooltip>
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
                <EquipMenuItems
                  entry={entry}
                  inventory={inventory}
                  {...equipHandlers}
                />
                <Menu.Item onClick={onEditQuantity}>
                  Изменить количество
                </Menu.Item>
                <Menu.Item color="red" onClick={onRemove}>
                  Убрать из инвентаря
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
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

export default InventoryRow;
