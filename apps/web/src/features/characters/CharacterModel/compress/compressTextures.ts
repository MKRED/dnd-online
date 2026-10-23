import type { Document } from '@gltf-transform/core';
import { EXTTextureWebP } from '@gltf-transform/extensions';

const WEBP = 'image/webp';
const WEBP_QUALITY = 0.85;

// Ужимает текстуры .glb до стороны side и перекодирует в WebP средствами браузера
// (OffscreenCanvas). textureCompress из @gltf-transform/functions не годится: он тянет
// ndarray, а тот собирает функции через Function(...) — CSP прода (script-src без
// 'unsafe-eval') роняет на этом весь поток сжатия ещё при загрузке.
export async function compressTextures(
  document: Document,
  side: number,
): Promise<void> {
  const textures = document.getRoot().listTextures();
  for (const texture of textures) {
    const image = texture.getImage();
    const mimeType = texture.getMimeType();
    if (!image) continue;
    // Без пересчёта цвета и альфы: карты нормалей и шероховатости — данные, не картинка.
    const bitmap = await createImageBitmap(
      new Blob([image], { type: mimeType }),
      { premultiplyAlpha: 'none', colorSpaceConversion: 'none' },
    );
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('OffscreenCanvas 2d context is unavailable');
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await canvas.convertToBlob({
      type: WEBP,
      quality: WEBP_QUALITY,
    });
    // Браузер без WebP-кодировщика отдаёт PNG — его и пишем, с честным типом.
    const encoded = new Uint8Array(await blob.arrayBuffer());
    if (encoded.length >= image.length && scale === 1) continue;
    texture.setImage(encoded).setMimeType(blob.type);
  }
  if (textures.some((texture) => texture.getMimeType() === WEBP))
    document.createExtension(EXTTextureWebP).setRequired(true);
}
