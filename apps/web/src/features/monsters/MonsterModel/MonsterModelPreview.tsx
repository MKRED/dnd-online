import { Center, Loader, Stack, Text } from '@mantine/core';
import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, type ReactNode } from 'react';
import type { MonsterRefModel } from 'shared';
import { monsterModelLook } from '../../maps/MapScene/objects/monsterModelLook';
import {
  ModelFigure,
  placedHeight,
  PreviewGuides,
  useModel,
  type ModelBox,
} from '../../maps/models';
import VoxelFigure from '../../voxelModels/VoxelFigure';
import { voxelFigureData } from '../../voxelModels/voxelBounds';

interface MonsterModelPreviewProps {
  model: MonsterRefModel;
  // Где взять байты файла модели: в форме — у своей модели, на карточке — маршрутом монстра.
  path: (modelId: string, version: number) => string;
  // Сторона места существа в клетках (по размеру монстра).
  footprint: number;
  size?: number;
  // Ростовая доска, стрелка взгляда и подпись роста — только в форме.
  guides?: boolean;
}

const CELL_COLOR = '#6b6157';

// Камера спереди-сбоку: взгляд фигурки — к −z, и модель сначала смотрит на зрителя.
const VIEW: [number, number, number] = [0.75, 0.7, -1.15];

// Поправка размера меняет рост модели, а камеру Canvas ставит один раз: отодвигаем её
// на новое расстояние, не сбивая угол, под которым она сейчас смотрит.
function Framing({ reach, targetY }: { reach: number; targetY: number }) {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.position.setLength(reach * Math.hypot(...VIEW));
  }, [camera, reach]);
  return (
    <OrbitControls
      target={[0, targetY, 0]}
      autoRotate
      autoRotateSpeed={1.5}
      enablePan={false}
    />
  );
}

const heightLabel = (cells: number) =>
  `${cells.toFixed(1).replace('.', ',')} клетки (${Math.round(cells * 5)} фт)`;

// Модель монстра так, как она встанет на карту (docs/plan/done/monster-models.md, этап 4): место
// по размеру существа, модель вписана в него с поправкой ссылки — файл или воксели, как
// на карте (monsterModelLook). Медленно вращается, мышью можно покрутить и приблизить.
// Модуль на three — грузится лениво.
function MonsterModelPreview({
  model,
  path,
  footprint,
  size = 260,
  guides = false,
}: MonsterModelPreviewProps) {
  const look = monsterModelLook(model, path);
  const file = look.kind === 'file' ? look : null;
  const state = useModel(file?.path ?? null, file?.format ?? null);
  const box = (content: ReactNode) => (
    <Center w={size} h={size}>
      {content}
    </Center>
  );

  let figure: { box: ModelBox; node: ReactNode };
  if (look.kind === 'file') {
    if (!state || state.status === 'loading') return box(<Loader size="sm" />);
    if (state.status === 'error')
      return box(
        <Text size="sm" c="red" ta="center">
          Модель не открылась. Проверьте файл в «Моделях».
        </Text>,
      );
    figure = {
      box: state.model.box,
      node: (
        <ModelFigure
          model={state.model}
          footprint={footprint}
          fit={look.fit}
          color={look.color}
        />
      ),
    };
  } else {
    const data = voxelFigureData(look.fields);
    if (!data)
      return box(
        <Text size="sm" c="dimmed" ta="center">
          Модель пустая — нарисуйте её
        </Text>,
      );
    figure = {
      box: data.box,
      node: <VoxelFigure data={data} footprint={footprint} fit={look.fit} />,
    };
  }

  const height = placedHeight(figure.box, footprint, look.fit);
  // Камера — чтобы в кадр вошли место, доска и вся модель с полем сверху.
  const top = Math.max(2, height);
  const reach = Math.max(1.7, 1.5 * Math.max(top, footprint * 1.2));
  return (
    <Stack gap={4} align="center" w={size}>
      <div style={{ width: size, height: size }}>
        <Canvas
          camera={{
            position: [reach * VIEW[0], reach * VIEW[1], reach * VIEW[2]],
            fov: 40,
          }}
        >
          {guides && <PreviewGuides height={height} footprint={footprint} />}
          <hemisphereLight args={['#ffffff', '#3a3530', 1.1]} />
          <directionalLight position={[3, 6, 4]} intensity={1.6} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
            <planeGeometry args={[footprint, footprint]} />
            <meshStandardMaterial color={CELL_COLOR} />
          </mesh>
          {figure.node}
          <Framing reach={reach} targetY={top * 0.45} />
        </Canvas>
      </div>
      {guides && (
        <Text size="xs" c="dimmed" ta="center">
          Рост на карте: {heightLabel(height)}
          <br />
          Стрелка — куда смотрит фигурка
        </Text>
      )}
    </Stack>
  );
}

export default MonsterModelPreview;
