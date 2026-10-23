import {
  ModelCompressError,
  type CompressProgress,
  type CompressResult,
} from './compressLimits';
import type { CompressWorkerMessage } from './compressWorker';

// Сжать файл модели в фоновом потоке. Поток живёт одну задачу: так память под модель
// на 100 МБ освобождается сразу, а библиотеки сжатия грузятся только когда нужны.
export function compressInWorker(
  file: File,
  onProgress: (progress: CompressProgress) => void,
): Promise<CompressResult> {
  return file.arrayBuffer().then(
    (data) =>
      new Promise<CompressResult>((resolve, reject) => {
        const worker = new Worker(
          new URL('./compressWorker.ts', import.meta.url),
          { type: 'module' },
        );
        const finish = () => worker.terminate();
        worker.onmessage = (event: MessageEvent<CompressWorkerMessage>) => {
          const message = event.data;
          if (message.type === 'progress') return onProgress(message.progress);
          finish();
          if (message.type === 'done') resolve(message.result);
          else reject(new ModelCompressError(message.message));
        };
        worker.onerror = (event) => {
          finish();
          console.error('Model compression worker crashed', event);
          reject(
            new ModelCompressError(
              'Не удалось сжать модель: не хватило памяти браузера или файл повреждён.',
            ),
          );
        };
        worker.postMessage(data, [data]);
      }),
  );
}
