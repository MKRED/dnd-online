import { Loader } from '@mantine/core';
import type { CSSProperties } from 'react';
import type { Item } from 'shared';
import { useImageUrl } from '../../../lib/useImageUrls';
import { itemImagePath } from '../itemsApi';
import classes from './ItemThumb.module.css';

interface ItemThumbProps {
  item: Pick<Item, 'id' | 'name' | 'image'>;
  // Размер буквы-заглушки: в списке квадрат маленький, в сетке — большой.
  placeholderSize?: string;
}

// Миниатюра предмета (вариант thumb с сервера), квадрат по ширине родителя. Без картинки —
// первая буква названия.
function ItemThumb({ item, placeholderSize }: ItemThumbProps) {
  const { image } = item;
  const url = useImageUrl(
    image && itemImagePath(item.id, 'thumb', image.version),
  );
  const style = placeholderSize
    ? ({ '--placeholder-size': placeholderSize } as CSSProperties)
    : undefined;

  return (
    <div className={classes.box} style={style}>
      {url ? (
        <img className={classes.image} src={url} alt="" />
      ) : image ? (
        <div className={classes.placeholder}>
          <Loader size="xs" />
        </div>
      ) : (
        <div className={classes.placeholder} aria-hidden>
          {item.name.trim().charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default ItemThumb;
