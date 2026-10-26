import { Badge, Group } from '@mantine/core';
import { isEquipmentCategory, type Item } from 'shared';
import { CATEGORY_LABELS, RARITY_COLORS, RARITY_LABELS } from '../itemLabels';

const needsAttunement = (item: Item) =>
  isEquipmentCategory(item.category) &&
  (item.details as { attunement: boolean }).attunement;

interface ItemBadgesProps {
  item: Item;
  // В «Моих» помечаем скрытые: в каталоге их не видно, а в своём списке они рядом с
  // опубликованными.
  showHidden: boolean;
}

// Категория, редкость (если она есть), «Настройка» у экипировки и пометка «Скрыт».
function ItemBadges({ item, showHidden }: ItemBadgesProps) {
  return (
    <Group gap={4}>
      <Badge size="xs" variant="light" color="gray">
        {CATEGORY_LABELS[item.category]}
      </Badge>
      {item.rarity !== 'none' && (
        <Badge size="xs" variant="light" color={RARITY_COLORS[item.rarity]}>
          {RARITY_LABELS[item.rarity]}
        </Badge>
      )}
      {needsAttunement(item) && (
        <Badge size="xs" variant="light" color="grape">
          Требует настройки
        </Badge>
      )}
      {showHidden && !item.isPublic && (
        <Badge size="xs" variant="outline" color="gray">
          Скрыт
        </Badge>
      )}
    </Group>
  );
}

export default ItemBadges;
