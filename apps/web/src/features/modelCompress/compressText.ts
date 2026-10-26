import type { CompressStats } from './compressLimits';

// Подписи сжатия: панель сжатия и итог у файла модели в «Моделях».
export const megabytes = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`;

// «1,2 млн», «180 тыс.», «950».
const triangles = (count: number) =>
  count >= 1_000_000
    ? `${(count / 1_000_000).toFixed(1).replace('.', ',')} млн`
    : count >= 1000
      ? `${Math.round(count / 1000)} тыс.`
      : String(count);

export const compressStatsText = (s: CompressStats) =>
  `${megabytes(s.bytes)} · ${triangles(s.triangles)} треугольников`;

export const compressedText = (result: {
  before: CompressStats;
  after: CompressStats;
}) =>
  `Сжато: было ${compressStatsText(result.before)} → стало ${compressStatsText(result.after)}.`;
