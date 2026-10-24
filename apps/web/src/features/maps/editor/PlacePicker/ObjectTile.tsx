import { Text, UnstyledButton } from '@mantine/core';
import classes from '../BlockPicker/BlockPicker.module.css';
import ChoicePicture from './ChoicePicture';
import own from './PlacePicker.module.css';
import {
  objectChoiceBadge,
  objectChoiceLabel,
  objectChoiceMeta,
  objectChoiceName,
  type ObjectChoice,
} from './placeChoice';

// Сторона подложки картинки и самой картинки на плитке.
export const TILE_PICTURE = 72;
const PICTURE = 64;

// Плитка объекта в окне «Что поставить» — крупная (вариант B макета): картинка на подложке,
// имя и приглушённо — размер и крепление или размер существа. badge — метка вида в углу.
function ObjectTile({
  choice,
  selected = false,
  badge = false,
  onClick,
}: {
  choice: ObjectChoice;
  selected?: boolean;
  badge?: boolean;
  onClick: () => void;
}) {
  const meta = objectChoiceMeta(choice);
  return (
    <UnstyledButton
      className={classes.tile}
      data-selected={selected || undefined}
      aria-pressed={selected}
      // Имя с размером и креплением одной строкой, как в поиске и панели.
      aria-label={objectChoiceLabel(choice)}
      onClick={onClick}
    >
      <span
        className={own.picture}
        style={{ width: TILE_PICTURE, height: TILE_PICTURE }}
      >
        <ChoicePicture choice={choice} size={PICTURE} />
        {badge && (
          <span className={own.badge} aria-hidden>
            {objectChoiceBadge(choice)}
          </span>
        )}
      </span>
      <Text size="xs" ta="center" lh={1.2} className={classes.tileLabel}>
        {objectChoiceName(choice)}
      </Text>
      {meta && (
        <Text fz={11} ta="center" lh={1.2} c="dimmed" className={own.meta}>
          {meta}
        </Text>
      )}
    </UnstyledButton>
  );
}

export default ObjectTile;
