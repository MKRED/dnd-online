import sharp from 'sharp';

// Общее ядро обработки загруженных картинок (персонажи, предметы).
const FULL_MAX_SIDE = 2048;
// Картинка в 10 МБ может распаковаться в гигабайты пикселей («бомба»). 50 Мп с запасом
// покрывают фото с телефона, остальное sharp отклонит, не декодируя.
const MAX_INPUT_PIXELS = 50_000_000;
const ACCEPTED_FORMATS = ['jpeg', 'png', 'webp'];

// Файл не картинка, повреждён или не того формата. Сервисы превращают это в 400.
export class UnsupportedImageError extends Error {}

export interface FullImage {
  data: Buffer;
  width: number;
  height: number;
}

// Загруженный файл как есть не храним: перекодируем в WebP не больше 2048 по стороне.
// Заодно это проверка формата по содержимому (расширению и Content-Type верить нельзя),
// поворот по EXIF и удаление метаданных (в фото бывает геометка). Анимация не
// поддерживается: sharp по умолчанию берёт первый кадр. Прозрачность WebP сохраняет.
export async function decodeToFull(input: Buffer): Promise<FullImage> {
  try {
    const source = () => sharp(input, { limitInputPixels: MAX_INPUT_PIXELS });
    const { format } = await source().metadata();
    if (!format || !ACCEPTED_FORMATS.includes(format)) {
      throw new UnsupportedImageError(`Формат ${format ?? 'неизвестен'}`);
    }
    const { data, info } = await source()
      .autoOrient()
      .resize({
        width: FULL_MAX_SIDE,
        height: FULL_MAX_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch (err: unknown) {
    if (err instanceof UnsupportedImageError) throw err;
    // sharp бросает обычный Error и на битый файл, и на превышение лимита пикселей.
    throw new UnsupportedImageError('Не удалось декодировать', { cause: err });
  }
}
