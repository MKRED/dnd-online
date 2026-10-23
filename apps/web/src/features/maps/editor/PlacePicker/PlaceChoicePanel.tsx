import { Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import type { BlockCatalog, Rotation } from 'shared';
import classes from '../BlockPicker/BlockPicker.module.css';
import BlockSwatch from '../BlockPicker/BlockSwatch';
import { BlockCatalogContext } from '../BlockPicker/catalogContext';
import ChoiceIcon from './ChoiceIcon';
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
}

// Что ставит инструмент (docs/plan/blocks.md, этап 10): текущее с миниатюрой (клик или B —
// окно «Что поставить») и строка недавних — до них один клик.
function PlaceChoicePanel(props: PlaceChoicePanelProps) {
  const { catalog, block, rotation, choice, blocksOnly } = props;
  const current = blocksOnly ? null : choice;
  const label = (name: string) => catalog.describe(name)?.label ?? name;
  const recent = props.recent.filter((r) =>
    r.type === 'block' ? catalog.describe(r.name) !== undefined : !blocksOnly,
  );
  const isCurrent = (r: RecentPlace) =>
    r.type === 'block'
      ? current === null && r.name === block
      : current !== null &&
        recentKey(r) === recentKey({ type: 'object', choice: current });

  return (
    <BlockCatalogContext.Provider value={catalog}>
      <Stack gap={6}>
        <Text size="sm" fw={500}>
          {blocksOnly ? 'Блок' : 'Ставить'}
        </Text>
        <UnstyledButton
          className={classes.current}
          onClick={props.onOpen}
          aria-label={blocksOnly ? 'Выбрать блок' : 'Выбрать, что ставить'}
        >
          {current ? (
            <ChoiceIcon choice={current} size={32} />
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
                      <ChoiceIcon choice={r.choice} size={22} />
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
