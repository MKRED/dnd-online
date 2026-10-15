import { Loader } from '@mantine/core';
import type { CatalogImage } from 'shared';
import { useImageUrl } from '../../lib/useImageUrls';
import type { ImagePathFn } from './catalogApi';
import CatalogThumb from './CatalogThumb';

interface EntryImageProps {
  entry: { id: string; name: string; image: CatalogImage | null };
  imagePath: ImagePathFn;
}

// Картинка на карточке записи — целиком (вариант full). Без картинки — большая буква,
// как у миниатюры.
function EntryImage({ entry, imagePath }: EntryImageProps) {
  const fullUrl = useImageUrl(
    entry.image && imagePath(entry.id, 'full', entry.image.version),
  );
  if (!entry.image) {
    return (
      <CatalogThumb
        entry={entry}
        imagePath={imagePath}
        placeholderSize="4rem"
      />
    );
  }
  if (!fullUrl) return <Loader />;
  return (
    <img
      src={fullUrl}
      alt={entry.name}
      style={{
        display: 'block',
        maxWidth: '100%',
        // На телефоне картинка над сведениями — высокая не должна их вытеснять.
        maxHeight: '45vh',
        margin: '0 auto',
        borderRadius: 'var(--mantine-radius-md)',
        // Подложка, как у миниатюр: у прозрачной картинки иначе не видно границ.
        background: 'var(--mantine-color-default-hover)',
      }}
    />
  );
}

export default EntryImage;
