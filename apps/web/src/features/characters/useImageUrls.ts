import { useEffect, useState } from 'react';
import {
  acquireImageUrl,
  imageRequestKey,
  peekImageUrl,
  releaseImageUrl,
  type ImageRequest,
} from './imageUrlCache';

// URL-ы для набора картинок: ключ запроса (imageRequestKey) → object URL. Пока картинка
// грузится или если загрузка не удалась, её ключа в результате нет.
export function useImageUrls(requests: ImageRequest[]): Record<string, string> {
  // Сами URL живут в кеше; состояние здесь только перерисовывает компонент, когда
  // очередная картинка догрузилась. Так в результат не попадёт уже отозванный URL.
  const [, setLoadedCount] = useState(0);
  // Массив запросов каждый рендер новый; эффект должен зависеть от его содержимого.
  const keys = requests.map(imageRequestKey).join('|');

  useEffect(() => {
    let active = true;
    for (const request of requests) {
      acquireImageUrl(request)
        .then(() => {
          if (active) setLoadedCount((count) => count + 1);
        })
        .catch((err: unknown) => {
          console.error('Failed to load character image', request, err);
        });
    }
    return () => {
      active = false;
      for (const request of requests) releaseImageUrl(request);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- см. комментарий у keys
  }, [keys]);

  const urls: Record<string, string> = {};
  for (const request of requests) {
    const url = peekImageUrl(request);
    if (url) urls[imageRequestKey(request)] = url;
  }
  return urls;
}

// Одна картинка; undefined, пока не загрузилась. request === null — показывать нечего.
export function useImageUrl(request: ImageRequest | null): string | undefined {
  const urls = useImageUrls(request ? [request] : []);
  return request ? urls[imageRequestKey(request)] : undefined;
}
