import { Text, UnstyledButton } from '@mantine/core';
import classes from '../BlockPicker/BlockPicker.module.css';
import ChoiceIcon from './ChoiceIcon';
import { objectChoiceLabel, type ObjectChoice } from './placeChoice';

// Плитка объекта в окне «Что поставить» — как плитка блока: значок вида и подпись.
function ObjectTile({
  choice,
  selected = false,
  onClick,
}: {
  choice: ObjectChoice;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <UnstyledButton
      className={classes.tile}
      data-selected={selected || undefined}
      aria-pressed={selected}
      onClick={onClick}
    >
      <ChoiceIcon choice={choice} size={34} />
      <Text size="xs" ta="center" lh={1.2} className={classes.tileLabel}>
        {objectChoiceLabel(choice)}
      </Text>
    </UnstyledButton>
  );
}

export default ObjectTile;
