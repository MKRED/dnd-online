import type { Item } from 'shared';
import { CatalogThumb } from '../catalog';
import { itemImagePath } from './itemsApi';

interface ItemThumbProps {
  item: Pick<Item, 'id' | 'name' | 'image'>;
  // Размер буквы-заглушки: в списке квадрат маленький, в сетке — большой.
  placeholderSize?: string;
}

// Миниатюра предмета — общая миниатюра каталога с адресами картинок предметов.
function ItemThumb({ item, placeholderSize }: ItemThumbProps) {
  return (
    <CatalogThumb
      entry={item}
      imagePath={itemImagePath}
      placeholderSize={placeholderSize}
    />
  );
}

export default ItemThumb;
