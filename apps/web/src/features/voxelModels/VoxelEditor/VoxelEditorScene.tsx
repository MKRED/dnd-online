import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import { MOUSE, TOUCH } from 'three';
import type { Vec3 } from 'shared';
import { cameraFor } from '../voxelCamera';
import VoxelGuides from '../VoxelGuides';
import VoxelMeshes from '../VoxelMeshes';
import type { VoxelHit } from '../voxelRaycast';
import type { VoxelEditorState } from './useVoxelEditor';
import VoxelOverlay from './VoxelOverlay';
import VoxelPointer from './VoxelPointer';

// 3D-холст редактора (docs/plan/blocks.md, этап 8а): левая кнопка — инструмент,
// правая — повернуть, средняя — сдвинуть, колесо — приблизить; на телефоне инструмент —
// одним пальцем, камера — двумя.
function VoxelEditorScene({ editor }: { editor: VoxelEditorState }) {
  const [hover, setHover] = useState<VoxelHit | null>(null);
  const { dims } = editor.grid;
  // Модель стоит серединой основания в начале координат: вращение — вокруг неё.
  const offset: Vec3 = [-dims[0] / 2, 0, -dims[2] / 2];
  // Камера ставится по размеру при открытии; новый размер её не двигает.
  const [camera] = useState(() => cameraFor(dims));
  return (
    <Canvas
      camera={{ position: camera.position, fov: 45, near: 0.5, far: 4000 }}
      style={{ touchAction: 'none' }}
    >
      <hemisphereLight args={['#ffffff', '#5a5048', 1.2]} />
      <directionalLight position={[60, 120, -80]} intensity={1.4} />
      <directionalLight position={[-80, 40, 60]} intensity={0.4} />
      <group position={offset}>
        <VoxelMeshes
          grid={editor.grid}
          change={editor.change}
          sliceTop={editor.sliceTop}
        />
        <VoxelGuides dims={dims} voxelLines />
        <VoxelOverlay editor={editor} hover={hover} />
      </group>
      <VoxelPointer editor={editor} offset={offset} onHover={setHover} />
      <OrbitControls
        makeDefault
        target={camera.target}
        mouseButtons={{ MIDDLE: MOUSE.PAN, RIGHT: MOUSE.ROTATE }}
        touches={{ TWO: TOUCH.DOLLY_ROTATE }}
      />
    </Canvas>
  );
}

export default VoxelEditorScene;
