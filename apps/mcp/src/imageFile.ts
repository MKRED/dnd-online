import { readFile, stat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { IMAGE_MAX_BYTES, type ThumbCrop } from 'shared';
import { DndApiError } from './apiClient.js';

// Картинка с диска для upload_image (docs/plan/ai-access.md, этап 4): её кладёт сюда
// comfy.generate или пользователь. Формат узнаём по первым байтам, а не по расширению:
// так в приложение не уйдёт под видом картинки любой другой файл с диска.
const SIGNATURES: { mime: string; test: (b: Buffer) => boolean }[] = [
  {
    mime: 'image/png',
    test: (b) =>
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  { mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 },
  {
    mime: 'image/webp',
    test: (b) =>
      b.toString('latin1', 0, 4) === 'RIFF' &&
      b.toString('latin1', 8, 12) === 'WEBP',
  },
];

export async function readImageFile(path: string) {
  if (!isAbsolute(path)) {
    throw new DndApiError(`Нужен абсолютный путь к файлу, а не «${path}».`);
  }
  let size: number;
  try {
    size = (await stat(path)).size;
  } catch (err) {
    console.error('Image file stat failed', path, err);
    throw new DndApiError(`Файл ${path} не найден или недоступен.`);
  }
  if (size > IMAGE_MAX_BYTES) {
    throw new DndApiError(
      `Файл ${path} больше ${IMAGE_MAX_BYTES / 1024 / 1024} МБ — уменьши картинку.`,
    );
  }
  const bytes = await readFile(path);
  const mime = SIGNATURES.find((s) => s.test(bytes))?.mime;
  if (!mime) {
    throw new DndApiError(`Файл ${path} — не PNG, JPEG или WebP.`);
  }
  return new Blob([bytes], { type: mime });
}

// Миниатюра долями картинки: центр (0..1 по ширине и высоте) и сторона квадрата (доля
// короткой стороны). Пикселями её задать нельзя: сервер уменьшает картинку до 2048 по
// большей стороне, и модель не знает итогового размера заранее. Квадрат сдвигается
// внутрь картинки — у персонажа миниатюра за край не выходит.
export interface ThumbArea {
  centerX: number;
  centerY: number;
  size: number;
}

export function thumbCropFor(
  area: ThumbArea,
  width: number,
  height: number,
): ThumbCrop {
  const side = Math.max(1, Math.round(area.size * Math.min(width, height)));
  const clamp = (value: number, max: number) =>
    Math.min(Math.max(0, Math.round(value)), max);
  return {
    x: clamp(area.centerX * width - side / 2, width - side),
    y: clamp(area.centerY * height - side / 2, height - side),
    size: side,
  };
}
