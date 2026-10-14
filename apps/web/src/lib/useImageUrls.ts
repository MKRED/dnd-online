import { useEffect, useState } from 'react';
import {
  acquireImageUrl,
  peekImageUrl,
  releaseImageUrl,
} from './imageUrlCache';

// URL-ы для набора картинок: путь картинки в API → object URL. Пока картинка грузится
// или если загрузка не удалась, её пути в результате нет.
export function useImageUrls(paths: string[]): Record<string, string> {
  // Сами URL живут в кеше; состояние здесь только перерисовывает компонент, когда
  // очередная картинка догрузилась. Так в результат не попадёт уже отозванный URL.
  const [, setLoadedCount] = useState(0);
  // Массив путей каждый рендер новый; эффект должен зависеть от его содержимого.
  const keys = paths.join('|');

  useEffect(() => {
    let active = true;
    for (const path of paths) {
      acquireImageUrl(path)
        .then(() => {
          if (active) setLoadedCount((count) => count + 1);
        })
        .catch((err: unknown) => {
          console.error('Failed to load image', path, err);
        });
    }
    return () => {
      active = false;
      for (const path of paths) releaseImageUrl(path);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- см. комментарий у keys
  }, [keys]);

  const urls: Record<string, string> = {};
  for (const path of paths) {
    const url = peekImageUrl(path);
    if (url) urls[path] = url;
  }
  return urls;
}

// Одна картинка; undefined, пока не загрузилась. path === null — показывать нечего.
export function useImageUrl(path: string | null): string | undefined {
  const urls = useImageUrls(path ? [path] : []);
  return path ? urls[path] : undefined;
}
