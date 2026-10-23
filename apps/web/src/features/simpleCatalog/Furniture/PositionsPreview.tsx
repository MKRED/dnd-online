import { Center, Loader, SegmentedControl, Stack } from '@mantine/core';
import { Suspense, useState } from 'react';
import type { VoxelModelFields } from 'shared';
import { ModelPreview, type PreviewMesh } from '../../voxelModels';
import NoModel from './NoModel';

const PREVIEW_SIZE = 260;

// id есть у модели из справочника: по нему берётся загруженный файл (этап 9).
type PreviewModel = VoxelModelFields & { id?: string };

export interface PreviewPosition {
  name: string;
  model: PreviewModel | null;
}

const meshOf = (model: PreviewModel): PreviewMesh | null =>
  model.mesh && model.id
    ? {
        source: {
          kind: 'stored',
          modelId: model.id,
          version: model.mesh.version,
          format: model.mesh.format,
        },
        fit: model.mesh.fit,
        color: model.mesh.color,
      }
    : null;

function Preview({
  model,
  empty,
}: {
  model: PreviewModel | null;
  empty: string;
}) {
  return model ? (
    <Suspense
      fallback={
        <Center w={PREVIEW_SIZE} h={PREVIEW_SIZE}>
          <Loader size="sm" />
        </Center>
      }
    >
      <ModelPreview model={model} size={PREVIEW_SIZE} mesh={meshOf(model)} />
    </Suspense>
  ) : (
    <NoModel size={PREVIEW_SIZE} text={empty} />
  );
}

// Вращающаяся модель обстановки (docs/plan/blocks.md, этапы 8б и 8г); с положениями —
// переключатель над ней, как положение двери на карте.
function PositionsPreview({
  model,
  positions,
  empty,
}: {
  model: PreviewModel | null;
  positions: PreviewPosition[];
  empty: string;
}) {
  const [picked, setPicked] = useState(0);
  if (positions.length < 2) return <Preview model={model} empty={empty} />;
  const index = Math.min(picked, positions.length - 1);
  return (
    <Stack gap="xs" align="center">
      <SegmentedControl
        size="xs"
        value={String(index)}
        onChange={(value) => setPicked(Number(value))}
        data={positions.map((position, i) => ({
          value: String(i),
          label: position.name.trim() || `Положение ${i + 1}`,
        }))}
      />
      <Preview model={positions[index].model} empty={empty} />
    </Stack>
  );
}

export default PositionsPreview;
