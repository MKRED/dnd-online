import { Center, Loader, Stack, Text } from '@mantine/core';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { CharacterModel } from 'shared';
import { ModelFigure, placedHeight, useModel } from '../../maps/models';
import { characterModelPath } from './characterModelApi';
import PreviewGuides from './PreviewGuides';

interface ModelPreviewProps {
  characterId: string;
  model: CharacterModel;
  size?: number;
  // Ростовая доска, стрелка взгляда и подпись роста — подсказки для поправки, только в
  // форме; на листе — одна модель.
  guides?: boolean;
}

const CELL_COLOR = '#6b6157';

// Рост в клетках и футах (1 клетка — 5 футов): «1,6 клетки · 8 фт».
const heightLabel = (cells: number) =>
  `${cells.toFixed(1).replace('.', ',')} клетки · ${Math.round(cells * 5)} фт`;

// Предпросмотр модели так, как она встанет на карту: клетка 1 × 1 (Средний), стрелка
// взгляда фигурки (туда должно смотреть лицо модели) и колонна клеток с футами для
// роста (PreviewGuides); модель вписана с поправкой, медленно вращается; мышью можно
// покрутить и приблизить.
// Модуль грузится лениво (CharacterModelBlock): three не должен попасть в общий бандл.
function ModelPreview({
  characterId,
  model,
  size = 260,
  guides = false,
}: ModelPreviewProps) {
  const state = useModel(
    characterModelPath(characterId, model.version),
    model.format,
  );
  if (!state || state.status === 'loading')
    return (
      <Center w={size} h={size}>
        <Loader size="sm" />
      </Center>
    );
  if (state.status === 'error')
    return (
      <Center w={size} h={size}>
        <Text size="sm" c="red" ta="center">
          Модель не открылась. Проверьте файл в редакторе и загрузите снова.
        </Text>
      </Center>
    );
  const height = placedHeight(state.model.box, 1, model.fit);
  // Камера — чтобы в кадр вошли клетка, доска и вся модель; спереди-сбоку: взгляд
  // фигурки — к −z, и модель сначала смотрит на зрителя.
  const top = Math.max(2, height);
  const reach = Math.max(1.7, top * 1.32);
  return (
    <Stack gap={4} align="center" w={size}>
      <div style={{ width: size, height: size }}>
        <Canvas
          camera={{
            position: [reach * 0.75, reach * 0.7, -reach * 1.15],
            fov: 40,
          }}
        >
          {guides && <PreviewGuides height={height} />}
          <hemisphereLight args={['#ffffff', '#3a3530', 1.1]} />
          <directionalLight position={[3, 6, 4]} intensity={1.6} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color={CELL_COLOR} />
          </mesh>
          <ModelFigure
            model={state.model}
            footprint={1}
            fit={model.fit}
            color={model.color}
          />
          <OrbitControls
            target={[0, top * 0.42, 0]}
            autoRotate
            autoRotateSpeed={1.5}
            enablePan={false}
          />
        </Canvas>
      </div>
      {guides && (
        <Text size="xs" c="dimmed" ta="center">
          Рост на карте: {heightLabel(height)}
          {height > 2 && (
            <Text span inherit c="orange">
              {' '}
              — выше двух клеток
            </Text>
          )}
          <br />
          Стрелка — куда смотрит фигурка
        </Text>
      )}
    </Stack>
  );
}

export default ModelPreview;
