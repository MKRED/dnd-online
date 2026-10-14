import { Group, Stack, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { Item } from 'shared';
import ItemThumb from '../ItemThumb';
import { formatCost, formatWeight } from '../itemLabels';
import ItemBadges from './ItemBadges';
import classes from './ItemCollection.module.css';

export type ItemCollectionView = 'grid' | 'list';

interface ItemCollectionProps {
  items: Item[];
  view: ItemCollectionView;
  // В каталоге предметы чужие — показываем автора; в «Моих» — пометку «Скрыт».
  scope: 'mine' | 'catalog';
}

// Предметы сеткой карточек (узнать по картинке) или списком (сравнить вес и цену).
function ItemCollection({ items, view, scope }: ItemCollectionProps) {
  const mine = scope === 'mine';

  if (view === 'list') {
    return (
      <Stack gap="xs">
        {items.map((item) => (
          <Link key={item.id} to={`/items/${item.id}`} className={classes.row}>
            <Group wrap="nowrap" gap="sm">
              <div className={classes.rowThumb}>
                <ItemThumb item={item} placeholderSize="1.25rem" />
              </div>
              <div className={classes.rowMain}>
                <Text fw={600} truncate>
                  {item.name}
                </Text>
                <Group gap="xs">
                  <ItemBadges item={item} showHidden={mine} />
                  {!mine && (
                    <Text size="xs" c="dimmed" truncate>
                      {item.authorNickname}
                    </Text>
                  )}
                </Group>
              </div>
              <div className={classes.rowNumbers}>
                <Text size="sm">{formatWeight(item.weight)}</Text>
                <Text size="sm" c="dimmed">
                  {formatCost(item.cost)}
                </Text>
              </div>
            </Group>
          </Link>
        ))}
      </Stack>
    );
  }

  return (
    <div className={classes.grid}>
      {items.map((item) => (
        <Link key={item.id} to={`/items/${item.id}`} className={classes.card}>
          <ItemThumb item={item} />
          <Stack gap={4} mt="xs">
            <Text fw={600} size="sm" lineClamp={2} className={classes.name}>
              {item.name}
            </Text>
            <ItemBadges item={item} showHidden={mine} />
            <Text size="xs" c="dimmed">
              {formatWeight(item.weight)} · {formatCost(item.cost)}
            </Text>
            {!mine && (
              <Text size="xs" c="dimmed" truncate>
                {item.authorNickname}
              </Text>
            )}
          </Stack>
        </Link>
      ))}
    </div>
  );
}

export default ItemCollection;
