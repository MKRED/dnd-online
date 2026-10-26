import { detectModelFormat } from 'shared';
import {
  ModelCompressError,
  type CompressProgress,
  type CompressResult,
} from './compressLimits';
import { compressGlb } from './compressGlb';
import { compressStl } from './compressStl';

// Сжимает модель до 9 МБ в том же формате: .glb — .glb, STL — STL
// (docs/plan/done/character-models.md, этап 5).
export function compressModel(
  bytes: Uint8Array,
  onProgress: (progress: CompressProgress) => void = () => {},
): Promise<CompressResult> {
  const format = detectModelFormat(bytes);
  if (format === 'glb') return compressGlb(bytes, onProgress);
  if (format === 'stl') return compressStl(bytes, onProgress);
  return Promise.reject(
    new ModelCompressError('Это не .glb и не STL — такой файл не подойдёт'),
  );
}
