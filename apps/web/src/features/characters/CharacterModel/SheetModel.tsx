import { Center, Loader, Stack } from '@mantine/core';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import type { CharacterModel } from 'shared';
import { getCharacterModel } from './characterModelApi';

// three — только когда модель есть.
const ModelPreview = lazy(() => import('./ModelPreview'));

interface SheetModelProps {
  characterId: string;
  size?: number;
  // Что показать, пока модели нет (и если её нет вовсе): в центре куклы — силуэт.
  fallback?: ReactNode;
}

// 3D-модель на листе персонажа (docs/plan/done/character-models.md, этап 4): только просмотр,
// в центре куклы (docs/plan/equipment.md, этап 2) или под портретом. Нет модели — fallback;
// правки — на странице редактирования.
function SheetModel({
  characterId,
  size = 240,
  fallback = null,
}: SheetModelProps) {
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

  if (!model) return fallback;
  return (
    <Stack gap={4} align="center">
      <Suspense
        fallback={
          <Center w={size} h={size}>
            <Loader size="sm" />
          </Center>
        }
      >
        <ModelPreview characterId={characterId} model={model} size={size} />
      </Suspense>
    </Stack>
  );
}

export default SheetModel;
