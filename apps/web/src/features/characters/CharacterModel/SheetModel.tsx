import { Center, Loader, Stack } from '@mantine/core';
import { lazy, Suspense, useEffect, useState } from 'react';
import type { CharacterModel } from 'shared';
import { getCharacterModel } from './characterModelApi';

// three — только когда модель есть.
const ModelPreview = lazy(() => import('./ModelPreview'));

const SIZE = 240;

// 3D-модель на листе персонажа (docs/plan/character-models.md, этап 4): только просмотр,
// под портретом. Нет модели — ничего; правки — на странице редактирования.
function SheetModel({ characterId }: { characterId: string }) {
  const [model, setModel] = useState<CharacterModel | null>(null);

  useEffect(() => {
    let alive = true;
    getCharacterModel(characterId)
      .then((loaded) => alive && setModel(loaded))
      // Лист читается и без модели: ошибка только в консоль.
      .catch((err: unknown) =>
        console.error('Failed to load character model for the sheet', err),
      );
    return () => {
      alive = false;
    };
  }, [characterId]);

  if (!model) return null;
  return (
    <Stack gap={4} align="center">
      <Suspense
        fallback={
          <Center w={SIZE} h={SIZE}>
            <Loader size="sm" />
          </Center>
        }
      >
        <ModelPreview characterId={characterId} model={model} size={SIZE} />
      </Suspense>
    </Stack>
  );
}

export default SheetModel;
