import { Center } from '@mantine/core';
import { IconCube } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import type { VoxelModelFields } from 'shared';

interface ModelThumbnailProps {
  // Запись и время её правки: по ним миниатюра берётся из кэша.
  cacheKey: string;
  model: VoxelModelFields;
  size: number;
}

// Картинка модели в списке. Рисовальщик (three) грузится лениво, а пока его нет или
// WebGL недоступен — значок куба.
function ModelThumbnail({ cacheKey, model, size }: ModelThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
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
  }, [cacheKey, model, size]);
  if (!url)
    return (
      <Center w={size} h={size} c="dimmed">
        <IconCube size={Math.min(48, size * 0.6)} stroke={1.2} />
      </Center>
    );
  return <img src={url} width={size} height={size} alt="" />;
}

export default ModelThumbnail;
