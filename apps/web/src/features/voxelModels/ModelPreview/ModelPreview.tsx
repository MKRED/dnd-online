import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import type { Vec3, VoxelModelFields } from 'shared';
import { cameraFor } from '../voxelCamera';
import type { MeshChange } from '../voxelGeometry';
import { gridFromFields } from '../voxelGrid';
import VoxelGuides from '../VoxelGuides';
import VoxelMeshes from '../VoxelMeshes';

interface ModelPreviewProps {
  model: VoxelModelFields;
  size?: number;
}

// Модель на карточке и в форме: медленно вращается, мышью её можно покрутить и
// приблизить; под ней — клетки, которые она займёт, и стрелка «вперёд».
// Модуль грузится лениво (voxelModels/index.ts): three не должен попасть в общий бандл.
function ModelPreview({ model, size = 260 }: ModelPreviewProps) {
  const grid = useMemo(() => gridFromFields(model), [model]);
  const change = useMemo<MeshChange>(
    () => ({ version: 0, cells: 'all' }),
    // Новая модель — новая сборка всех клеток.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grid],
  );
  const camera = cameraFor(grid.dims, true);
  const offset: Vec3 = [-grid.dims[0] / 2, 0, -grid.dims[2] / 2];
  return (
    <div style={{ width: size, height: size }}>
      {/* camera у Canvas — только начальная: новый размер модели — новый холст. */}
      <Canvas
        key={grid.dims.join('x')}
        camera={{ position: camera.position, fov: 40, far: 4000 }}
      >
        <hemisphereLight args={['#ffffff', '#5a5048', 1.2]} />
        <directionalLight position={[60, 120, -80]} intensity={1.4} />
        <directionalLight position={[-80, 40, 60]} intensity={0.4} />
        <group position={offset}>
          <VoxelMeshes grid={grid} change={change} sliceTop={grid.dims[1]} />
          <VoxelGuides dims={grid.dims} />
        </group>
        <OrbitControls
          target={camera.target}
          autoRotate
          autoRotateSpeed={1.2}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}

export default ModelPreview;
