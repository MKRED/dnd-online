import { Text, UnstyledButton } from '@mantine/core';
import type { Rotation } from 'shared';
import BlockSwatch from './BlockSwatch';
import classes from './BlockPicker.module.css';

interface BlockTileProps {
  block: string;
  label: string;
  selected?: boolean;
  rotation?: Rotation;
  onClick: () => void;
  onDoubleClick?: () => void;
}

// Плитка окна выбора: миниатюра и подпись под ней.
function BlockTile({
  block,
  label,
  selected = false,
  rotation,
  onClick,
  onDoubleClick,
}: BlockTileProps) {
  return (
    <UnstyledButton
      className={classes.tile}
      data-selected={selected || undefined}
      aria-pressed={selected}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <BlockSwatch block={block} rotation={rotation} size={40} />
      <Text size="xs" ta="center" lh={1.2} className={classes.tileLabel}>
        {label}
      </Text>
    </UnstyledButton>
  );
}

export default BlockTile;
