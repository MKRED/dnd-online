// Общее для всех загружаемых картинок (персонажи, предметы): лимиты и принимаемые форматы.
// Общие для формы и сервера: форма отсекает лишнее до отправки, сервер проверяет сам.
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

// Квадрат миниатюры в пикселях варианта full (он не меняется после загрузки).
export interface ThumbCrop {
  x: number;
  y: number;
  size: number;
}
