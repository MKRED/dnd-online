import sharp from 'sharp';

// Превью для модели: уменьшенный JPEG, чтобы картинка не съела контекст. Сторона 512 —
// хватает, чтобы оценить сюжет и композицию; мелкие дефекты (пальцы, текст) на нём можно
// не заметить, это известное ограничение (docs/plan/ai-access.md, «Цикл модели»).
export const PREVIEW_SIDE = 512;

export async function previewOf(image: Buffer) {
  const meta = await sharp(image).metadata();
  const data = await sharp(image)
    .resize({
      width: PREVIEW_SIDE,
      height: PREVIEW_SIDE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
  return {
    base64: data.toString('base64'),
    // Размер самой картинки, а не превью: его видит пользователь и сервер dnd.
    width: meta.width,
    height: meta.height,
  };
}
