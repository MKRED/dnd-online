import {
  ActionIcon,
  Group,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { BlockCatalog, Rotation } from 'shared';
import classes from '../BlockPicker/BlockPicker.module.css';
import BlockSwatch from '../BlockPicker/BlockSwatch';
import { BlockCatalogContext } from '../BlockPicker/catalogContext';
import ChoicePicture from './ChoicePicture';
import {
  objectChoiceLabel,
  recentKey,
  type ObjectChoice,
  type RecentPlace,
} from './placeChoice';
import PlacePickerModal from './PlacePickerModal';

interface PlaceChoicePanelProps {
  // Каталог блоков карты: базовые и свои группы владельца (у сцены — мастера).
  catalog: BlockCatalog;
  block: string;
  rotation: Rotation;
  // Ставящийся объект; null — блок. У заливки, коробки и замены — всегда блок.
  choice: ObjectChoice | null;
  recent: readonly RecentPlace[];
  blocksOnly: boolean;
  opened: boolean;
  onOpen: () => void;
  onClose: () => void;
  // Выбрано в окне — становится первым в недавних.
  onPickBlock: (block: string) => void;
  onPickObject: (choice: ObjectChoice) => void;
  // Взято из недавних в панели — порядок не меняется, чтобы плитки не прыгали под курсором.
  onSelectRecent: (recent: RecentPlace) => void;
  // «Поставить» без выбранного: щелчок по карте ничего не ставит (вариант В артборда «Н2»).
  empty: boolean;
  // ✕ — снять выбранное, как Esc.
  onClear: () => void;
}

// Что ставит инструмент (docs/plan/blocks.md, этап 10): текущее с миниатюрой (клик или B —
// окно «Что поставить») и строка недавних — до них один клик.
function PlaceChoicePanel(props: PlaceChoicePanelProps) {
  const { catalog, block, rotation, choice, blocksOnly } = props;
  const current = blocksOnly ? null : choice;
  const empty = !blocksOnly && props.empty;
  const label = (name: string) => catalog.describe(name)?.label ?? name;
  const recent = props.recent.filter((r) =>
    r.type === 'block' ? catalog.describe(r.name) !== undefined : !blocksOnly,
  );
  const isCurrent = (r: RecentPlace) =>
    empty
      ? false
      : r.type === 'block'
        ? current === null && r.name === block
        : current !== null &&
          recentKey(r) === recentKey({ type: 'object', choice: current });

  return (
    <BlockCatalogContext.Provider value={catalog}>
      <Stack gap={6}>
        <Text size="sm" fw={500}>
          {blocksOnly ? 'Блок' : 'Ставить'}
        </Text>
        {empty ? (
          <UnstyledButton
            className={classes.current}
            data-empty
            onClick={props.onOpen}
            aria-label="Выбрать, что ставить"
          >
            <Text size="sm" c="dimmed" flex={1}>
              Ничего не выбрано
            </Text>
            <Text size="xs" c="dimmed">
              Выбрать (B)
            </Text>
          </UnstyledButton>
        ) : (
          <Group gap={6} wrap="nowrap">
            <UnstyledButton
              className={classes.current}
              style={{ flex: 1, minWidth: 0 }}
              onClick={props.onOpen}
              aria-label={blocksOnly ? 'Выбрать блок' : 'Выбрать, что ставить'}
            >
              {current ? (
                <ChoicePicture choice={current} size={32} />
              ) : (
                <BlockSwatch block={block} rotation={rotation} size={32} />
              )}
              <Text size="sm" flex={1} truncate>
                {current ? objectChoiceLabel(current) : label(block)}
              </Text>
              <Text size="xs" c="dimmed">
                Сменить (B)
              </Text>
            </UnstyledButton>
            {!blocksOnly && (
              <Tooltip label="Снять (Esc)" withArrow>
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label="Снять выбранное"
                  onClick={props.onClear}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        )}

        {recent.length > 1 && (
          <div className={classes.recent} aria-label="Недавние">
            {recent.map((r) => {
              const name =
                r.type === 'block'
                  ? label(r.name)
                  : objectChoiceLabel(r.choice);
              return (
                <Tooltip key={recentKey(r)} label={name} withArrow>
                  <UnstyledButton
                    className={classes.recentTile}
                    data-selected={isCurrent(r) || undefined}
                    aria-pressed={isCurrent(r)}
                    aria-label={name}
                    onClick={() => props.onSelectRecent(r)}
                  >
                    {r.type === 'block' ? (
                      <BlockSwatch block={r.name} size={28} />
                    ) : (
                      <ChoicePicture choice={r.choice} size={28} />
                    )}
                  </UnstyledButton>
                </Tooltip>
              );
            })}
          </div>
        )}

        {props.opened && (
          <PlacePickerModal
            block={block}
            current={current}
            recent={recent}
            blocksOnly={blocksOnly}
            onPickBlock={(name) => {
              props.onPickBlock(name);
              props.onClose();
            }}
            onPickObject={(picked) => {
              props.onPickObject(picked);
              props.onClose();
            }}
            onClose={props.onClose}
          />
        )}
      </Stack>
    </BlockCatalogContext.Provider>
  );
}

export default PlaceChoicePanel;
