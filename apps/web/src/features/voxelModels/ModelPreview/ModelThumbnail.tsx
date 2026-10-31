import { Center } from '@mantine/core';
import { IconCube } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import type { VoxelModelFields } from 'shared';
import { useImageUrl } from '../../../lib/useImageUrls';

interface ModelThumbnailProps {
  // Запись и время её правки: по ним миниатюра берётся из кэша.
  cacheKey: string;
  model: VoxelModelFields;
  size: number;
  // Адрес снимка модели с файлом (modelSnapshotPath, этап 9г); есть — вместо вокселей.
  snapshot?: string | null;
}

// Картинка модели в списке. Рисовальщик (three) грузится лениво, а пока его нет или
// WebGL недоступен — значок куба. У модели с загруженным файлом — её снимок с сервера.
function ModelThumbnail({
  cacheKey,
  model,
  size,
  snapshot = null,
}: ModelThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null);
  const snapshotUrl = useImageUrl(snapshot);
  useEffect(() => {
    if (snapshot) return;
    let alive = true;
    import('./renderThumbnail')
      .then(({ modelThumbnail }) => {
        if (alive) setUrl(modelThumbnail(cacheKey, model, size));
      })
      .catch((err: unknown) =>
        console.error('Failed to draw a model thumbnail', err),
      );
    return () => {
      alive = false;
    };
  }, [cacheKey, model, size, snapshot]);
  const src = snapshot ? snapshotUrl : url;
  if (!src)
    return (
      <Center w={size} h={size} c="dimmed">
        <IconCube size={Math.min(48, size * 0.6)} stroke={1.2} />
      </Center>
    );
  return <img src={src} width={size} height={size} alt="" />;
}

export default ModelThumbnail;
