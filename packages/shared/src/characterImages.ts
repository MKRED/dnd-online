// Картинки персонажа (docs/plan/character-images.md): галерея, основная картинка и её
// миниатюра. Сами байты клиент получает отдельным запросом, здесь только метаданные.
import { IMAGE_MAX_BYTES, IMAGE_MIME_TYPES, type ThumbCrop } from './images.js';

// Каждая картинка хранится в трёх вариантах, все в WebP:
// full — для просмотра, preview — для сетки галереи, thumb — квадратный вырез-миниатюра.
export const CHARACTER_IMAGE_VARIANTS = ['full', 'preview', 'thumb'] as const;
export type CharacterImageVariant = (typeof CHARACTER_IMAGE_VARIANTS)[number];

// Лимиты общие для формы и сервера: форма отсекает лишнее до отправки, сервер проверяет сам.
// Размер и форматы — общие для всех картинок (images.ts).
export const CHARACTER_IMAGE_MAX_BYTES = IMAGE_MAX_BYTES;
export const CHARACTER_IMAGE_MAX_COUNT = 20;
export const CHARACTER_IMAGE_MIME_TYPES = IMAGE_MIME_TYPES;

export interface CharacterImage {
  id: string;
  characterId: string;
  position: number;
  isMain: boolean;
  // Размеры варианта full.
  width: number;
  height: number;
  thumbCrop: ThumbCrop;
  // Растёт при смене выреза: идёт в адрес миниатюры, чтобы не показать старую из кеша.
  thumbVersion: number;
  createdAt: string;
}

// То, что нужно списку персонажей, чтобы показать портрет без запроса галереи.
export type CharacterMainImage = Pick<CharacterImage, 'id' | 'thumbVersion'>;
