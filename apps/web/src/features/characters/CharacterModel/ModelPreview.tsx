import { Center, Loader, Text } from '@mantine/core';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { CharacterModel } from 'shared';
import { ModelFigure, placedHeight, useModel } from '../../maps/models';
import { characterModelPath } from './characterModelApi';

interface ModelPreviewProps {
  characterId: string;
  model: CharacterModel;
  size?: number;
}

const CELL_COLOR = '#6b6157';

// Предпросмотр модели так, как она встанет на карту: клетка 1 × 1 (Средний), модель
// вписана с поправкой, медленно вращается; мышью можно покрутить и приблизить.
// Модуль грузится лениво (CharacterModelBlock): three не должен попасть в общий бандл.
function ModelPreview({ characterId, model, size = 260 }: ModelPreviewProps) {
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
  // Камера — чтобы в кадр вошли и клетка, и вся модель.
  const reach = Math.max(1.4, height * 1.3);
  return (
    <div style={{ width: size, height: size }}>
      <Canvas
        camera={{
          position: [reach * 0.9, reach * 0.75, reach * 1.1],
          fov: 40,
        }}
      >
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
          target={[0, height / 2, 0]}
          autoRotate
          autoRotateSpeed={1.5}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}

export default ModelPreview;
