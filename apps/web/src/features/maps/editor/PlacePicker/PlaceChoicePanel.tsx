import {
  ActionIcon,
  Button,
  Kbd,
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
import SectionLabel from '../ToolPanel/SectionLabel';
import {
  objectChoiceLabel,
  objectChoiceMeta,
  objectChoiceName,
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

// Вид ставящегося словом — под именем на карточке «Что ставить».
const KIND_WORDS: Record<ObjectChoice['kind'], string> = {
  start: 'старт',
  container: 'контейнер',
  furniture: 'обстановка',
  item: 'предмет',
  creature: 'существо',
};

const choiceSubtitle = (choice: ObjectChoice) =>
  [KIND_WORDS[choice.kind], objectChoiceMeta(choice)]
    .filter(Boolean)
    .join(' · ');

// Что ставит инструмент (docs/plan/blocks.md, этап 10; вид — макет «П2»,
// docs/plan/scene-page.md, этап 3): текущее с миниатюрой (клик или B —
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
        <SectionLabel title={blocksOnly ? 'Блок' : 'Что ставить'} />
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
          <div className={classes.choiceCard}>
            {current ? (
              <ChoicePicture choice={current} size={48} />
            ) : (
              <BlockSwatch block={block} rotation={rotation} size={48} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={600} truncate>
                {current ? objectChoiceName(current) : label(block)}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {current ? choiceSubtitle(current) : 'блок'}
              </Text>
            </div>
            <Button
              variant="default"
              size="xs"
              px={8}
              onClick={props.onOpen}
              aria-label={blocksOnly ? 'Выбрать блок' : 'Выбрать, что ставить'}
              rightSection={<Kbd size="xs">B</Kbd>}
            >
              Выбрать
            </Button>
            {!blocksOnly && (
              <Tooltip label="Снять (Esc)" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Снять выбранное"
                  onClick={props.onClear}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </div>
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
                      <BlockSwatch block={r.name} size={34} />
                    ) : (
                      <ChoicePicture choice={r.choice} size={34} />
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
