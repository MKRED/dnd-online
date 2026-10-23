import { Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import type { BlockCatalog, Rotation } from 'shared';
import BlockPickerModal from './BlockPickerModal';
import BlockSwatch from './BlockSwatch';
import { BlockCatalogContext } from './catalogContext';
import { shownRecent } from './recentBlocks';
import classes from './BlockPicker.module.css';

interface BlockPickerProps {
  // Каталог блоков карты: базовые и свои группы владельца (у сцены — мастера).
  catalog: BlockCatalog;
  block: string;
  rotation: Rotation;
  recent: readonly string[];
  opened: boolean;
  onOpen: () => void;
  onClose: () => void;
  // Блок выбран в окне — он становится первым в недавних.
  onPick: (block: string) => void;
  // Блок взят из недавних в панели — порядок не меняется, чтобы плитки не прыгали
  // под курсором.
  onSelect: (block: string) => void;
}

// Блок в панели инструмента: текущий с миниатюрой (клик или B — окно выбора) и строка
// недавних — до них один клик.
function BlockPicker({
  catalog,
  block,
  rotation,
  recent,
  opened,
  onOpen,
  onClose,
  onPick,
  onSelect,
}: BlockPickerProps) {
  const label = (name: string) => catalog.describe(name)?.label ?? name;
  const recentShown = shownRecent(recent, catalog);
  return (
    <BlockCatalogContext.Provider value={catalog}>
      <Stack gap={6}>
        <Text size="sm" fw={500}>
          Блок
        </Text>
        <UnstyledButton
          className={classes.current}
          onClick={onOpen}
          aria-label="Выбрать блок"
        >
          <BlockSwatch block={block} rotation={rotation} size={32} />
          <Text size="sm" flex={1} truncate>
            {label(block)}
          </Text>
          <Text size="xs" c="dimmed">
            Сменить (B)
          </Text>
        </UnstyledButton>

        {recentShown.length > 1 && (
          <div className={classes.recent} aria-label="Недавние блоки">
            {recentShown.map((name) => (
              <Tooltip key={name} label={label(name)} withArrow>
                <UnstyledButton
                  className={classes.recentTile}
                  data-selected={name === block || undefined}
                  aria-pressed={name === block}
                  aria-label={label(name)}
                  onClick={() => onSelect(name)}
                >
                  <BlockSwatch block={name} size={28} />
                </UnstyledButton>
              </Tooltip>
            ))}
          </div>
        )}

        {opened && (
          <BlockPickerModal
            block={block}
            recent={recent}
            onPick={(name) => {
              onPick(name);
              onClose();
            }}
            onClose={onClose}
          />
        )}
      </Stack>
    </BlockCatalogContext.Provider>
  );
}

export default BlockPicker;
