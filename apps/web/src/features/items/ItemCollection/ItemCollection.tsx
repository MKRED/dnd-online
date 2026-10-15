import type { Item } from 'shared';
import { CatalogCollection, type CatalogCollectionView } from '../../catalog';
import { formatCost, formatWeight } from '../itemLabels';
import { itemImagePath } from '../itemsApi';
import ItemBadges from './ItemBadges';

interface ItemCollectionProps {
  items: Item[];
  view: CatalogCollectionView;
  scope: 'mine' | 'catalog';
}

// Предметы сеткой или списком — общая коллекция каталога с весом и ценой.
function ItemCollection({ items, view, scope }: ItemCollectionProps) {
  return (
    <CatalogCollection
      entries={items}
      view={view}
      scope={scope}
      basePath="/items"
      imagePath={itemImagePath}
      // В «Моих» помечаем скрытые: в каталоге их не видно.
      badges={(item) => (
        <ItemBadges item={item} showHidden={scope === 'mine'} />
      )}
      numbers={(item) => ({
        primary: formatWeight(item.weight),
        secondary: formatCost(item.cost),
      })}
    />
  );
}

export default ItemCollection;
