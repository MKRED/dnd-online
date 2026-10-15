import {
  defaultCatalogThumbCrop,
  type CatalogImage,
  type ThumbCrop,
} from 'shared';

// Картинка в форме записи каталога до сохранения. Сохраняется вместе с формой одной кнопкой.
export type ImageDraft =
  // Картинки нет (или её убрали — тогда при сохранении она удалится).
  | { kind: 'none' }
  // Сохранённая картинка; crop — в пикселях варианта full, может отличаться от
  // сохранённого, если вырез поправили.
  | { kind: 'saved'; image: CatalogImage; crop: ThumbCrop }
  // Новый файл. Размеры и вырез — в пикселях исходного файла; null — вырез не трогали,
  // сервер сам впишет картинку целиком.
  | {
      kind: 'new';
      file: File;
      url: string;
      width: number;
      height: number;
      crop: ThumbCrop | null;
    };

export function initialDraft(image: CatalogImage | null): ImageDraft {
  return image
    ? { kind: 'saved', image, crop: image.thumbCrop }
    : { kind: 'none' };
}

export function sameCrop(a: ThumbCrop, b: ThumbCrop): boolean {
  return a.x === b.x && a.y === b.y && a.size === b.size;
}

// Вырез, который сейчас показывает форма, и размеры картинки в тех же пикселях.
export function effectiveCrop(draft: Exclude<ImageDraft, { kind: 'none' }>): {
  width: number;
  height: number;
  crop: ThumbCrop;
} {
  if (draft.kind === 'saved') {
    const { width, height } = draft.image;
    return { width, height, crop: draft.crop };
  }
  const { width, height } = draft;
  return {
    width,
    height,
    crop: draft.crop ?? defaultCatalogThumbCrop(width, height),
  };
}

// Вырез из пикселей исходного файла в пиксели сохранённого full: сервер уменьшает
// картинку до 2048 по стороне, и вырез, выбранный на исходнике, надо пересчитать.
export function scaleCrop(crop: ThumbCrop, factor: number): ThumbCrop {
  return {
    x: Math.round(crop.x * factor),
    y: Math.round(crop.y * factor),
    size: Math.max(1, Math.round(crop.size * factor)),
  };
}

// Размеры картинки из файла — их знает только браузер, пока сервер не обработал файл.
// Браузер учитывает поворот по EXIF так же, как сервер (autoOrient).
export function readImageFile(
  file: File,
): Promise<{ url: string; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ url, width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать картинку'));
    };
    image.src = url;
  });
}
