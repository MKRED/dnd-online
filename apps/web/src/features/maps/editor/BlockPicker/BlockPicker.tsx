import { Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { getBlock, type Rotation } from 'shared';
import BlockPickerModal from './BlockPickerModal';
import BlockSwatch from './BlockSwatch';
import classes from './BlockPicker.module.css';

interface BlockPickerProps {
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
  block,
  rotation,
  recent,
  opened,
  onOpen,
  onClose,
  onPick,
  onSelect,
}: BlockPickerProps) {
  return (
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
          {getBlock(block)?.label ?? block}
        </Text>
        <Text size="xs" c="dimmed">
          Сменить (B)
        </Text>
      </UnstyledButton>

      {recent.length > 1 && (
        <div className={classes.recent} aria-label="Недавние блоки">
          {recent.map((name) => (
            <Tooltip key={name} label={getBlock(name)?.label} withArrow>
              <UnstyledButton
                className={classes.recentTile}
                data-selected={name === block || undefined}
                aria-pressed={name === block}
                aria-label={getBlock(name)?.label}
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
  );
}

export default BlockPicker;
