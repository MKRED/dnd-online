import { Anchor, Center, Loader, Stack, Text } from '@mantine/core';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { CREATURE_SIZES, type Monster } from 'shared';
import { monsterModelPath } from '../monstersApi';

// three — только когда модель есть.
const MonsterModelPreview = lazy(() => import('./MonsterModelPreview'));

const SIZE = 240;

// 3D-модель на карточке монстра (docs/plan/done/monster-models.md, этап 4): под портретом, как
// на листе персонажа. Байты — маршрутом монстра: модель видит всякий, кто видит монстра.
// Ссылка на модель — только тому, кто может открыть её в «Моделях».
function MonsterSheetModel({ monster }: { monster: Monster }) {
  const view = monster.modelView;
  if (!view || !monster.model) return null;
  const footprint = CREATURE_SIZES[monster.statBlock.size].footprint;
  return (
    <Stack gap={4} align="center">
      <Suspense
        fallback={
          <Center w={SIZE} h={SIZE}>
            <Loader size="sm" />
          </Center>
        }
      >
        <MonsterModelPreview
          model={{ ...view, scale: monster.model.scale }}
          path={(modelId, version) =>
            monsterModelPath(monster.id, modelId, version)
          }
          footprint={footprint}
          size={SIZE}
        />
      </Suspense>
      {view.available && (
        <Text size="sm" c="dimmed" ta="center">
          3D-модель:{' '}
          <Anchor component={Link} to={`/models/${view.id}`} size="sm">
            «{view.name}»
          </Anchor>
        </Text>
      )}
    </Stack>
  );
}

export default MonsterSheetModel;
