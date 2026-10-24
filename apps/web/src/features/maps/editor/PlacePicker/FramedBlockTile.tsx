import { Text, UnstyledButton } from '@mantine/core';
import classes from '../BlockPicker/BlockPicker.module.css';
import BlockSwatch from '../BlockPicker/BlockSwatch';
import { TILE_PICTURE } from './ObjectTile';
import own from './PlacePicker.module.css';

// Блок среди объектов (недавние, общий поиск): на такой же подложке, как картинка объекта,
// — иначе ряд из блоков и объектов шёл бы вразнобой по высоте.
function FramedBlockTile({
  block,
  label,
  selected,
  onClick,
}: {
  block: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <UnstyledButton
      className={classes.tile}
      data-selected={selected || undefined}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span
        className={own.picture}
        style={{ width: TILE_PICTURE, height: TILE_PICTURE }}
      >
        <BlockSwatch block={block} size={48} />
      </span>
      <Text size="xs" ta="center" lh={1.2} className={classes.tileLabel}>
        {label}
      </Text>
    </UnstyledButton>
  );
}

export default FramedBlockTile;
