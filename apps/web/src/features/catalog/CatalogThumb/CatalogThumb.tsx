import { Loader } from '@mantine/core';
import type { CSSProperties } from 'react';
import type { CatalogImage } from 'shared';
import { useImageUrl } from '../../../lib/useImageUrls';
import type { ImagePathFn } from '../catalogApi';
import classes from './CatalogThumb.module.css';

interface CatalogThumbProps {
  entry: { id: string; name: string; image: CatalogImage | null };
  imagePath: ImagePathFn;
  // Размер буквы-заглушки: в списке квадрат маленький, в сетке — большой.
  placeholderSize?: string;
}

// Миниатюра записи каталога (вариант thumb с сервера), квадрат по ширине родителя. Без
// картинки — первая буква названия.
function CatalogThumb({
  entry,
  imagePath,
  placeholderSize,
}: CatalogThumbProps) {
  const { image } = entry;
  const url = useImageUrl(image && imagePath(entry.id, 'thumb', image.version));
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
          {entry.name.trim().charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default CatalogThumb;
