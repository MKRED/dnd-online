// 3D-модель персонажа или НПС (docs/plan/character-models.md): `.glb` или STL, одна на
// персонажа. На карте она стоит вместо карточки, вписанная в место существа.

export const CHARACTER_MODEL_FORMATS = ['glb', 'stl'] as const;
export type CharacterModelFormat = (typeof CHARACTER_MODEL_FORMATS)[number];

// Миниатюры HeroForge весят 2–8 МБ; больше — уже слишком тяжело для сцены.
export const CHARACTER_MODEL_MAX_BYTES = 10 * 1024 * 1024;

// Ручная поправка к вписыванию в место: множитель размера, поворот вокруг вертикали
// четвертями оборота (лицо модели — к взгляду фигурки) и какая ось модели — верх.
export interface CharacterModelFit {
  scale: number;
  turn: 0 | 1 | 2 | 3;
  up: 'y' | 'z';
}

export const MODEL_SCALE_MIN = 0.25;
export const MODEL_SCALE_MAX = 4;

export interface CharacterModel {
  format: CharacterModelFormat;
  // Размер файла в байтах.
  size: number;
  // Растёт с каждой новой загрузкой: клиент кэширует байты по ней.
  version: number;
  // Цвет фигурки из STL (#rrggbb); у `.glb` свои цвета — null.
  color: string | null;
  fit: CharacterModelFit;
  updatedAt: string;
}

// Модель фигурки на сцене — без размера файла и даты: байты берут по версии
// маршрутом игры (docs/plan/character-models.md, этап 3).
export type FigureModel = Pick<
  CharacterModel,
  'format' | 'version' | 'color' | 'fit'
>;

// Ответ GET /characters/:id/model.
export interface CharacterModelView {
  model: CharacterModel | null;
}

// Правка без нового файла: цвет (только у STL) и поправка.
export interface CharacterModelPatch {
  color?: string;
  fit?: CharacterModelFit;
}

// Цвет фигурки из STL по умолчанию — серый камень, как у некрашеной миниатюры.
export const STL_DEFAULT_COLOR = '#9a948a';

// У glTF «вверх» — Y по стандарту, у STL для 3D-печати обычно Z.
export function defaultModelFit(
  format: CharacterModelFormat,
): CharacterModelFit {
  return { scale: 1, turn: 0, up: format === 'glb' ? 'y' : 'z' };
}

export function isModelFit(value: unknown): value is CharacterModelFit {
  if (typeof value !== 'object' || value === null) return false;
  const { scale, turn, up } = value as Record<string, unknown>;
  return (
    Object.keys(value).length === 3 &&
    typeof scale === 'number' &&
    scale >= MODEL_SCALE_MIN &&
    scale <= MODEL_SCALE_MAX &&
    (turn === 0 || turn === 1 || turn === 2 || turn === 3) &&
    (up === 'y' || up === 'z')
  );
}

const ascii = (bytes: Uint8Array, from: number, length: number) =>
  String.fromCharCode(...bytes.subarray(from, from + length));

// Формат по первым байтам, а не по имени файла. `.glb`: «glTF», версия 2 и длина файла
// в заголовке. Двоичный STL: 80 байт заголовка, число треугольников и по 50 байт на
// каждый — размер сходится точно. Текстовый STL начинается с «solid» и содержит
// «facet» (двоичные тоже бывают с «solid» в заголовке, поэтому они проверяются раньше).
export function detectModelFormat(
  bytes: Uint8Array,
): CharacterModelFormat | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === 'glTF' &&
    view.getUint32(4, true) === 2 &&
    view.getUint32(8, true) === bytes.length
  )
    return 'glb';
  if (bytes.length >= 84) {
    const triangles = view.getUint32(80, true);
    if (triangles > 0 && 84 + triangles * 50 === bytes.length) return 'stl';
  }
  const head = ascii(bytes, 0, Math.min(bytes.length, 1024)).trimStart();
  if (head.startsWith('solid') && head.includes('facet')) return 'stl';
  return null;
}
