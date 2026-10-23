import {
  ModelCompressError,
  type CompressProgress,
  type CompressResult,
} from './compressLimits';
import { compressModel } from './compressModel';

// Сжатие в фоновом потоке: упрощение модели на миллион треугольников занимает секунды,
// и страница всё это время не должна стоять.

export type CompressWorkerMessage =
  | { type: 'progress'; progress: CompressProgress }
  | { type: 'done'; result: CompressResult }
  | { type: 'error'; message: string };

const post = (message: CompressWorkerMessage, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer });

self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  compressModel(new Uint8Array(event.data), (progress) =>
    post({ type: 'progress', progress }),
  )
    .then((result) => {
      // Своя копия байтов: data может быть окном в больший буфер.
      const data = result.data.slice();
      post({ type: 'done', result: { ...result, data } }, [data.buffer]);
    })
    .catch((err: unknown) => {
      console.error('Model compression failed', err);
      post({
        type: 'error',
        message:
          err instanceof ModelCompressError
            ? err.message
            : 'Не удалось сжать модель. Упростите её в Blender и загрузите снова.',
      });
    });
};
