import { useComputedColorScheme } from '@mantine/core';
import { MapControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { Box3, MapState } from 'shared';
import type { CameraPlacement } from '../cameraView';
import type { SceneEditor } from '../editor/editorTools';
import CameraRig from './CameraRig';
import EditLayer from './EditLayer';
import FirstFrame from './FirstFrame';
import ChunkMesh from './ChunkMesh';
import { useChunkMeshes } from './useChunkMeshes';
import classes from './MapScene.module.css';

// Фон сцены под схему страницы: в тёмной — угольный чуть темнее фона страницы,
// в светлой — тёмный пергамент, как стол под картой.
const SCENE_BACKGROUND = { light: '#d8ccb2', dark: '#191613' };

interface MapSceneProps {
  map: MapState;
  // Срез по высоте: клетки выше не рисуются.
  cutY: number;
  // Начальная камера (из адреса страницы); дальше ей управляет пользователь.
  camera: CameraPlacement;
  // Границы карты на момент открытия: вокруг них сетка земли в редакторе.
  frame: Box3;
  // Инструмент редактора; null — только просмотр.
  editor: SceneEditor | null;
  // Первый кадр отрисован (см. FirstFrame).
  onReady: () => void;
}

function MapScene({
  map,
  cutY,
  camera,
  frame,
  editor,
  onReady,
}: MapSceneProps) {
  const chunks = useChunkMeshes(map, cutY);
  const scheme = useComputedColorScheme('dark');

  return (
    <div className={classes.canvas}>
      <Canvas
        frameloop="demand"
        camera={{ position: camera.position, fov: 45, near: 0.1, far: 5000 }}
      >
        <color attach="background" args={[SCENE_BACKGROUND[scheme]]} />
        <hemisphereLight args={['#ffffff', '#3a3530', 0.9]} />
        <directionalLight position={[40, 80, 30]} intensity={1.6} />
        <EditLayer editor={editor} frame={frame}>
          {[...chunks].map(([key, { meshes }]) => (
            <group key={key}>
              {meshes.opaque && (
                <ChunkMesh buffers={meshes.opaque} transparent={false} />
              )}
              {meshes.transparent && (
                <ChunkMesh buffers={meshes.transparent} transparent />
              )}
            </group>
          ))}
        </EditLayer>
        <MapControls makeDefault />
        <CameraRig placement={camera} />
        <FirstFrame onReady={onReady} />
      </Canvas>
    </div>
  );
}

export default MapScene;
