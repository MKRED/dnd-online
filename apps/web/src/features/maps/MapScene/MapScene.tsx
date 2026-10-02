import { MapControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import type { MapState } from 'shared';
import type { CameraPlacement } from '../cameraView';
import { createBlockLookup } from '../render/blockLookup';
import { buildChunkMesh } from '../render/buildChunkMesh';
import CameraRig from './CameraRig';
import FirstFrame from './FirstFrame';
import ChunkMesh from './ChunkMesh';
import classes from './MapScene.module.css';

interface MapSceneProps {
  map: MapState;
  // Срез по высоте: клетки выше не рисуются.
  cutY: number;
  // Начальная камера (из адреса страницы); дальше ей управляет пользователь.
  camera: CameraPlacement;
  // Первый кадр отрисован (см. FirstFrame).
  onReady: () => void;
}

function MapScene({ map, cutY, camera, onReady }: MapSceneProps) {
  const chunks = useMemo(() => {
    const lookup = createBlockLookup(map.palette);
    return [...map.store.keys()].map((key) => ({
      key,
      ...buildChunkMesh(map.store, key, lookup, { cutY }),
    }));
  }, [map, cutY]);

  return (
    <div className={classes.canvas}>
      <Canvas
        frameloop="demand"
        camera={{ position: camera.position, fov: 45, near: 0.1, far: 5000 }}
      >
        <color attach="background" args={['#15161a']} />
        <hemisphereLight args={['#ffffff', '#3a3530', 0.9]} />
        <directionalLight position={[40, 80, 30]} intensity={1.6} />
        {chunks.map(({ key, opaque, transparent }) => (
          <group key={key}>
            {opaque && <ChunkMesh buffers={opaque} transparent={false} />}
            {transparent && <ChunkMesh buffers={transparent} transparent />}
          </group>
        ))}
        <MapControls makeDefault />
        <CameraRig placement={camera} />
        <FirstFrame onReady={onReady} />
      </Canvas>
    </div>
  );
}

export default MapScene;
