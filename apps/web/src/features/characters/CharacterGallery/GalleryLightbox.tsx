import { Lightbox, type ToolbarItemsPayload } from '@mantine/lightbox';
import { useState } from 'react';
import type { CharacterImage } from 'shared';
import { imageRequestKey, type ImageRequest } from '../imageUrlCache';
import { useImageUrls } from '../useImageUrls';
import {
  IconClose,
  IconDownload,
  IconEnterFullscreen,
  IconExitFullscreen,
  IconThumbnails,
} from './galleryIcons';

// Прозрачный пиксель: слайду нужен src сразу, а картинка ещё грузится.
const EMPTY_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

const LABELS = {
  lightboxLabel: 'Просмотр картинок',
  slideLabel: (index: number, total: number) => `Картинка ${index} из ${total}`,
  slidesLabel: 'Картинки',
  previousSlideLabel: 'Предыдущая картинка',
  nextSlideLabel: 'Следующая картинка',
  thumbnailLabel: (index: number) => `Перейти к картинке ${index}`,
};

interface GalleryLightboxProps {
  characterId: string;
  characterName: string;
  images: CharacterImage[];
  initialIndex: number;
  onClose: () => void;
}

// Сохранить уже загруженный blob под понятным именем. Штатная кнопка скачивания
// @mantine/lightbox назвала бы файл идентификатором из blob-адреса, без расширения.
function download(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Просмотр на весь экран. Компонент монтируют на время просмотра.
function GalleryLightbox({
  characterId,
  characterName,
  images,
  initialIndex,
  onClose,
}: GalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  // Полные картинки грузим не все сразу, а для открытой и её соседей; просмотренные
  // остаются загруженными, пока просмотрщик открыт.
  const [visited, setVisited] = useState(() => new Set([initialIndex]));

  const request = (image: CharacterImage, variant: 'full' | 'preview') =>
    ({ characterId, imageId: image.id, variant }) satisfies ImageRequest;
  const wantsFull = (position: number) =>
    visited.has(position) || Math.abs(position - index) <= 1;
  const urls = useImageUrls([
    ...images.map((image) => request(image, 'preview')),
    ...images
      .filter((_, position) => wantsFull(position))
      .map((image) => request(image, 'full')),
  ]);
  const urlOf = (image: CharacterImage, variant: 'full' | 'preview') =>
    urls[imageRequestKey(request(image, variant))];

  const slides = images.map((image, position) => {
    const preview = urlOf(image, 'preview');
    return {
      // Пока полная картинка в пути, показываем превью — не пустой экран.
      src: urlOf(image, 'full') ?? preview ?? EMPTY_PIXEL,
      thumbSrc: preview ?? EMPTY_PIXEL,
      alt: `${characterName}, картинка ${position + 1}`,
    };
  });

  const toolbarItems = (toolbar: ToolbarItemsPayload) => {
    const current = images[toolbar.currentIndex];
    const full = current && urlOf(current, 'full');
    return [
      {
        key: 'thumbnails',
        icon: <IconThumbnails />,
        label: toolbar.thumbnailsVisible ? 'Скрыть ленту' : 'Показать ленту',
        onClick: toolbar.toggleThumbnails,
        position: 'left' as const,
      },
      {
        key: 'download',
        icon: <IconDownload />,
        label: 'Скачать',
        onClick: () => {
          if (!full) return;
          download(full, `${characterName} ${toolbar.currentIndex + 1}.webp`);
        },
      },
      {
        key: 'fullscreen',
        icon: toolbar.isFullscreen ? (
          <IconExitFullscreen />
        ) : (
          <IconEnterFullscreen />
        ),
        label: toolbar.isFullscreen
          ? 'Выйти из полного экрана'
          : 'На весь экран',
        onClick: toolbar.toggleFullscreen,
      },
      {
        key: 'close',
        icon: <IconClose />,
        label: 'Закрыть',
        onClick: toolbar.close,
      },
    ];
  };

  return (
    <Lightbox
      opened
      onClose={onClose}
      slides={slides}
      currentIndex={index}
      onIndexChange={(next) => {
        setIndex(next);
        setVisited((prev) => new Set(prev).add(next));
      }}
      labels={LABELS}
      toolbarItems={toolbarItems}
      withZoom
      withThumbnails={images.length > 1}
      withFullscreen
      // Штатный фон прозрачен на 10%, и на светлой теме сквозь него читается страница:
      // даже 3% прозрачности заметны. Делаем глухой чёрный.
      vars={() => ({
        root: { '--lightbox-overlay-color': '#000' },
      })}
    />
  );
}

export default GalleryLightbox;
