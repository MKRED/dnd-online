// PNG из пикселей RGBA без canvas: значкам блоков в окне выбора нужна картинка, а
// canvas нет в тестах (jsdom). Сжатие не нужно — плитка 16 × 16 весит около килобайта,
// поэтому deflate из «несжатых» блоков (тип 0) и никакого zlib.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const u32 = (value: number) => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];

function chunk(type: string, data: number[]): number[] {
  const body = new Uint8Array(
    [...type].map((c) => c.charCodeAt(0)).concat(data),
  );
  return [...u32(data.length), ...body, ...u32(crc32(body))];
}

// zlib-поток из несжатых блоков deflate (не больше 65535 байт в блоке).
function storedZlib(raw: Uint8Array): number[] {
  const out = [0x78, 0x01];
  for (let at = 0; at < raw.length || at === 0; at += 65535) {
    const part = raw.subarray(at, at + 65535);
    const last = at + 65535 >= raw.length ? 1 : 0;
    out.push(last, part.length & 0xff, part.length >>> 8);
    out.push(~part.length & 0xff, (~part.length >>> 8) & 0xff, ...part);
    if (last) break;
  }
  return [...out, ...u32(adler32(raw))];
}

export function encodePng(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  // Каждая строка начинается с байта фильтра (0 — без фильтра).
  const raw = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw.set(
      rgba.subarray(y * width * 4, (y + 1) * width * 4),
      y * (width * 4 + 1) + 1,
    );
  }
  // IHDR: 8 бит на канал, тип цвета 6 — RGBA.
  const header = [...u32(width), ...u32(height), 8, 6, 0, 0, 0];
  return new Uint8Array([
    ...PNG_SIGNATURE,
    ...chunk('IHDR', header),
    ...chunk('IDAT', storedZlib(raw)),
    ...chunk('IEND', []),
  ]);
}

export function pngDataUrl(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): string {
  let binary = '';
  for (const byte of encodePng(rgba, width, height)) {
    binary += String.fromCharCode(byte);
  }
  return `data:image/png;base64,${btoa(binary)}`;
}
