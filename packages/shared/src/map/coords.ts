// Координаты клеток карты: целые числа, y — высота (как в three.js). Одна клетка = 5 футов.
export type Vec3 = readonly [x: number, y: number, z: number];

// Прямоугольная область клеток, границы включительно.
export interface Box3 {
  min: Vec3;
  max: Vec3;
}

export const CHUNK_SIZE = 16;
export const CHUNK_VOLUME = CHUNK_SIZE ** 3;

export function chunkCoordOf(v: number): number {
  return Math.floor(v / CHUNK_SIZE);
}

// % в JS сохраняет знак делимого (-1 % 16 === -1), а карта растёт и в отрицательные
// координаты — без поправки индекс внутри чанка ушёл бы за границы массива.
export function localCoordOf(v: number): number {
  return ((v % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
}

export function chunkKey(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`;
}

export function parseChunkKey(key: string): Vec3 {
  const [cx, cy, cz] = key.split(',').map(Number);
  return [cx, cy, cz];
}

// Индекс внутри чанка: y — старший разряд, чтобы горизонтальный слой (срез по
// высоте, ASCII-срез) лежал в массиве непрерывно.
export function localIndex(lx: number, ly: number, lz: number): number {
  return lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE;
}

export function cellLocation(cell: Vec3): { key: string; index: number } {
  const [x, y, z] = cell;
  return {
    key: chunkKey(chunkCoordOf(x), chunkCoordOf(y), chunkCoordOf(z)),
    index: localIndex(localCoordOf(x), localCoordOf(y), localCoordOf(z)),
  };
}

// Обратное к cellLocation: мировая клетка по координатам чанка и индексу в нём.
export function cellFromChunk(chunk: Vec3, index: number): Vec3 {
  const lx = index % CHUNK_SIZE;
  const lz = Math.floor(index / CHUNK_SIZE) % CHUNK_SIZE;
  const ly = Math.floor(index / (CHUNK_SIZE * CHUNK_SIZE));
  return [
    chunk[0] * CHUNK_SIZE + lx,
    chunk[1] * CHUNK_SIZE + ly,
    chunk[2] * CHUNK_SIZE + lz,
  ];
}

// Углы можно передавать в любом порядке — нейросети и инструменту «коробка» так проще.
export function boxFromCorners(a: Vec3, b: Vec3): Box3 {
  return {
    min: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])],
    max: [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])],
  };
}

export function boxVolume({ min, max }: Box3): number {
  return (max[0] - min[0] + 1) * (max[1] - min[1] + 1) * (max[2] - min[2] + 1);
}

export function* cellsInBox({ min, max }: Box3): Generator<Vec3> {
  for (let y = min[1]; y <= max[1]; y++) {
    for (let z = min[2]; z <= max[2]; z++) {
      for (let x = min[0]; x <= max[0]; x++) {
        yield [x, y, z];
      }
    }
  }
}

// Ключи всех чанков, которые задевает область: сервер подгружает их из БД до применения операции.
export function chunkKeysInBox({ min, max }: Box3): string[] {
  const keys: string[] = [];
  for (let cy = chunkCoordOf(min[1]); cy <= chunkCoordOf(max[1]); cy++) {
    for (let cz = chunkCoordOf(min[2]); cz <= chunkCoordOf(max[2]); cz++) {
      for (let cx = chunkCoordOf(min[0]); cx <= chunkCoordOf(max[0]); cx++) {
        keys.push(chunkKey(cx, cy, cz));
      }
    }
  }
  return keys;
}
