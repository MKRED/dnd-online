// Воксели модели в записи (docs/plan/blocks.md, этап 8а): байт на воксель, 0 — пусто,
// 1…255 — номер цвета палитры плюс один. Хранятся сжатыми повторами: пара «значение,
// длина серии», длина — LEB128 (7 бит на байт, старший — «дальше ещё»). Воксельные
// модели почти целиком из пустоты и сплошных рядов одного цвета, поэтому серии
// сжимают их в сотни раз, а код одинаковый у браузера и сервера и синхронный.

export function encodeVoxels(voxels: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < voxels.length) {
    const value = voxels[i];
    let run = 1;
    while (i + run < voxels.length && voxels[i + run] === value) run++;
    out.push(value);
    let rest = run;
    while (rest >= 0x80) {
      out.push((rest & 0x7f) | 0x80);
      rest >>>= 7;
    }
    out.push(rest);
    i += run;
  }
  return Uint8Array.from(out);
}

// null — испорченные данные: серия нулевой длины, обрыв посреди пары или не та длина.
export function decodeVoxels(
  bytes: Uint8Array,
  length: number,
): Uint8Array | null {
  const voxels = new Uint8Array(length);
  let at = 0;
  let i = 0;
  while (i < bytes.length) {
    const value = bytes[i++];
    let run = 0;
    let shift = 0;
    for (;;) {
      if (i >= bytes.length || shift > 28) return null;
      const byte = bytes[i++];
      run |= (byte & 0x7f) << shift;
      if (!(byte & 0x80)) break;
      shift += 7;
    }
    if (run === 0 || at + run > length) return null;
    voxels.fill(value, at, at + run);
    at += run;
  }
  return at === length ? voxels : null;
}

// base64 без Buffer: shared работает и в браузере. Кусками — String.fromCharCode с
// миллионом аргументов переполнил бы стек.
export function bytesToBase64(bytes: Uint8Array): string {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}

export function base64ToBytes(base64: string): Uint8Array | null {
  let text: string;
  try {
    text = atob(base64);
  } catch {
    // Не base64 — данные испорчены; вызывающий объясняет это сам.
    return null;
  }
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return bytes;
}
