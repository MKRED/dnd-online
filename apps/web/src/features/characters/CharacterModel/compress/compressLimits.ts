import { CHARACTER_MODEL_MAX_BYTES } from 'shared';

// Сжатие тяжёлой модели в браузере (docs/plan/done/character-models.md, этап 5): в базе
// модель не больше CHARACTER_MODEL_MAX_BYTES (10 МБ), а загрузить можно файл до 100 МБ —
// от 10 до 100 МБ браузер сам ужимает его до 8–9 МБ и отправляет уже сжатый.
export const MODEL_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;

// Сколько метить при упрощении: с запасом до предела, чтобы промах оценки не выкидывал
// за 10 МБ.
export const COMPRESS_TARGET_BYTES = 8.5 * 1024 * 1024;

// Сжатый файл больше этого — сжатие не удалось.
export const COMPRESS_LIMIT_BYTES = 9 * 1024 * 1024;

// Сколько раз пробовать строже, если после записи файл всё ещё велик.
export const COMPRESS_MAX_PASSES = 4;

export const needsCompression = (bytes: number) =>
  bytes > CHARACTER_MODEL_MAX_BYTES && bytes <= MODEL_UPLOAD_MAX_BYTES;

// Ошибка сжатия с текстом для пользователя.
export class ModelCompressError extends Error {}

export interface CompressStats {
  bytes: number;
  triangles: number;
}

// Ход сжатия для строки «Сжимаю…».
export type CompressProgress =
  | { stage: 'read' }
  | { stage: 'textures' }
  | { stage: 'simplify'; pass: number; passes: number };

export interface CompressResult {
  data: Uint8Array;
  before: CompressStats;
  after: CompressStats;
}
