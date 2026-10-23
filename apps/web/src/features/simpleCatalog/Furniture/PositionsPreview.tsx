import { Center, Loader, SegmentedControl, Stack } from '@mantine/core';
import { Suspense, useState } from 'react';
import type { VoxelModelFields } from 'shared';
import { ModelPreview } from '../../voxelModels';
import NoModel from './NoModel';

const PREVIEW_SIZE = 260;

export interface PreviewPosition {
  name: string;
  model: VoxelModelFields | null;
}

function Preview({
  model,
  empty,
}: {
  model: VoxelModelFields | null;
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
      <ModelPreview model={model} size={PREVIEW_SIZE} />
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
  model: VoxelModelFields | null;
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
