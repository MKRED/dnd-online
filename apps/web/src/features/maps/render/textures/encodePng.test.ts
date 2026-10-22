import { describe, expect, it } from 'vitest';
import { encodePng, pngDataUrl } from './encodePng';

describe('encodePng', () => {
  it('writes a PNG whose image data inflates back to the pixels', async () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 128]);
    const png = encodePng(rgba, 2, 1);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    // IDAT начинается после подписи (8), IHDR (8 + 13 + 4) и своих длины и типа (8).
    const view = new DataView(png.buffer);
    const idatLength = view.getUint32(33);
    // Настоящий распаковщик, а не разбор своих же блоков: PNG должен понять браузер.
    const stream = new Response(
      png.slice(41, 41 + idatLength),
    ).body!.pipeThrough(new DecompressionStream('deflate'));
    const data = new Uint8Array(await new Response(stream).arrayBuffer());
    expect([...data]).toEqual([0, 255, 0, 0, 255, 0, 255, 0, 128]);
  });

  it('wraps it in a data URL for an <image>', () => {
    const url = pngDataUrl(new Uint8ClampedArray(16 * 16 * 4), 16, 16);
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
  });
});
