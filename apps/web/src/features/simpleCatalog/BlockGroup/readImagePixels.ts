// Предел размера: плитка всё равно 16×16, а огромный canvas может не создаться.
const MAX_PIXELS = 4096 * 4096;

export class ImageTooLargeError extends Error {}

// Пиксели загруженной картинки через canvas — оболочка вокруг downscaleTile, которую
// тесты (jsdom без canvas) не запускают.
export async function readImagePixels(
  file: File,
): Promise<{ rgba: Uint8ClampedArray; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > MAX_PIXELS)
      throw new ImageTooLargeError(
        'Картинка слишком большая: нужна не больше 4096 × 4096 пикселей',
      );
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D недоступен');
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return { rgba: data, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
