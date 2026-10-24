import {
  SegmentedControl,
  Stack,
  Switch,
  Text,
  UnstyledButton,
} from '@mantine/core';
import type { MapOp } from 'shared';
import { useImageUrl } from '../../../lib/useImageUrls';
import type { CardTarget } from './useCardWindows';
import type { ObjectInfo, ObjectInfoItem } from './objectInfo';
import classes from './CardWindows.module.css';

interface ObjectCardBodyProps {
  objectId: number;
  info: ObjectInfo | null;
  // Правка сцены от мастера: положение двери и замок — операции журнала, видны всем сразу.
  applyOps: (ops: MapOp[]) => void;
  busy: boolean;
  onOpenCard: (target: CardTarget) => void;
}

function ItemRow({
  item,
  onOpen,
}: {
  item: ObjectInfoItem;
  onOpen: () => void;
}) {
  const url = useImageUrl(item.image);
  return (
    <UnstyledButton className={classes.itemRow} onClick={onOpen}>
      <span className={classes.itemThumb} aria-hidden="true">
        {url && <img src={url} alt="" />}
      </span>
      <Text size="sm" style={{ flex: 1, minWidth: 0 }} truncate>
        {item.name}
      </Text>
      <Text size="sm" c="dimmed">
        × {item.quantity}
      </Text>
    </UnstyledButton>
  );
}

// Окно сундука, предмета на полу или обстановки у мастера в «Игре» (docs/plan/scene-page.md,
// этап 6, вариант В): содержимое со ссылками на карточки предметов, замок и положения двери.
// Содержимое правится в «Правке».
function ObjectCardBody({
  objectId,
  info,
  applyOps,
  busy,
  onOpenCard,
}: ObjectCardBodyProps) {
  if (!info) {
    return (
      <Text size="sm" c="dimmed">
        Объекта больше нет на сцене.
      </Text>
    );
  }
  return (
    <Stack gap="sm">
      {info.positions.length >= 2 && (
        <Stack gap={4}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Положение
          </Text>
          <SegmentedControl
            fullWidth
            size="sm"
            data={info.positions.map((name, index) => ({
              value: String(index),
              label: name,
            }))}
            value={String(info.position)}
            disabled={busy}
            onChange={(value) =>
              applyOps([
                { op: 'setPosition', id: objectId, position: Number(value) },
              ])
            }
          />
        </Stack>
      )}
      {(info.positions.length >= 2 || info.locked) && (
        <Switch
          label="Заперт"
          checked={info.locked}
          disabled={busy}
          onChange={(e) =>
            applyOps([
              {
                op: 'updateObject',
                id: objectId,
                object: { locked: e.currentTarget.checked },
              },
            ])
          }
        />
      )}
      {info.items && (
        <Stack gap={2}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            {info.itemsLabel}
          </Text>
          {info.items.length === 0 ? (
            <Text size="sm" c="dimmed">
              Пусто
            </Text>
          ) : (
            info.items.map((item) => (
              <ItemRow
                key={item.itemId}
                item={item}
                onOpen={() => onOpenCard({ kind: 'item', itemId: item.itemId })}
              />
            ))
          )}
          <Text size="xs" c="dimmed">
            Щелчок по предмету — его карточка. Править — в «Правке».
          </Text>
        </Stack>
      )}
    </Stack>
  );
}

export default ObjectCardBody;
