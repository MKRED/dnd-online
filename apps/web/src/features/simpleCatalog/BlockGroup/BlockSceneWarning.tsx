import { Alert } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { BlockGroupUsage } from 'shared';
import { apiRequest } from '../../../lib/apiRequest';

// Предупреждение в форме своей группы (docs/plan/blocks.md, этап 7): её блоки стоят на
// сценах игр, и правка после сохранения сразу дойдёт до игроков. Сцены не копируют
// блоки — блоки сцены и есть записи справочника мастера. У новой группы (нет id в
// адресе) сцен быть не может. Не удалось спросить — предупреждения нет, форма работает.
function BlockSceneWarning() {
  const { id } = useParams();
  const [scenes, setScenes] = useState<BlockGroupUsage['scenes']>([]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    apiRequest<BlockGroupUsage>(`/block-groups/${id}/usage`)
      .then((usage) => {
        if (active) setScenes(usage.scenes);
      })
      .catch((err: unknown) => {
        console.error('Failed to load block group usage', err);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!scenes.length) return null;
  const where = scenes
    .map((scene) => `«${scene.name}» (игра «${scene.gameName}»)`)
    .join(', ');
  return (
    <Alert color="orange" p="sm" title="Блоки стоят на сценах игр">
      {where}. Правка после сохранения сразу дойдёт до игроков: сцены не
      копируют блоки, а берут их из справочника.
    </Alert>
  );
}

export default BlockSceneWarning;
