import { useEffect, useRef, useState } from 'react';
import { SRGBColorSpace, TextureLoader, type Texture } from 'three';
import {
  acquireImageUrl,
  releaseImageUrl,
} from '../../../../lib/imageUrlCache';

interface Entry {
  cancelled: boolean;
  texture?: Texture;
}

// Миниатюры объектов как текстуры. Байты идут через кеш blob-адресов (lib/imageUrlCache):
// прямой адрес API в TextureLoader не обновил бы истёкшую сессию.
// textures: путь → текстура, null — загрузить не удалось (карточка покажет букву).
// settled — каждая картинка загрузилась или не загрузилась: этого ждёт «Сцена готова».
export function useObjectTextures(paths: string[]) {
  const [textures, setTextures] = useState<Map<string, Texture | null>>(
    () => new Map(),
  );
  // Начатые загрузки — чтобы новая картинка после правки не перезагружала остальные.
  const entries = useRef(new Map<string, Entry>());
  const keys = paths.join('|');

  useEffect(() => {
    const wanted = new Set(keys ? keys.split('|') : []);
    const live = entries.current;
    const settle = (path: string, texture: Texture | null) =>
      setTextures((prev) => new Map(prev).set(path, texture));

    for (const path of wanted) {
      if (live.has(path)) continue;
      const entry: Entry = { cancelled: false };
      live.set(path, entry);
      acquireImageUrl(path)
        .then((url) => new TextureLoader().loadAsync(url))
        .then((texture) => {
          if (entry.cancelled) {
            texture.dispose();
            return;
          }
          texture.colorSpace = SRGBColorSpace;
          entry.texture = texture;
          settle(path, texture);
        })
        .catch((err: unknown) => {
          console.error('Failed to load map object image', path, err);
          if (!entry.cancelled) settle(path, null);
        });
    }
    // Ушедшие пути остаются в textures, но не мешают: settled смотрит только на
    // нужные, а вернувшийся путь загрузится заново и перезапишет запись.
    for (const [path, entry] of live) {
      if (!wanted.has(path)) drop(live, path, entry);
    }
  }, [keys]);

  // Уход со страницы: освобождаем всё. Повторный запуск эффектов в StrictMode
  // после этого начнёт загрузки заново.
  useEffect(() => {
    const live = entries.current;
    return () => {
      for (const [path, entry] of live) drop(live, path, entry);
    };
  }, []);

  const settled = paths.every((path) => textures.has(path));
  return { textures, settled };
}

function drop(live: Map<string, Entry>, path: string, entry: Entry) {
  entry.cancelled = true;
  entry.texture?.dispose();
  live.delete(path);
  releaseImageUrl(path);
}
