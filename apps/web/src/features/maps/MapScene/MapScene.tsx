import { MapControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import type { Box3, MapState } from 'shared';
import { createBlockLookup } from '../render/blockLookup';
import { buildChunkMesh } from '../render/buildChunkMesh';
import ChunkMesh from './ChunkMesh';
import classes from './MapScene.module.css';

interface MapSceneProps {
  map: MapState;
  bounds: Box3;
  // Срез по высоте: клетки выше не рисуются.
  cutY: number;
}

// Камера смотрит с юга на север и сверху: север (-z) — вверху экрана, как в ASCII-срезе.
function cameraFraming({ min, max }: Box3) {
  const center: [number, number, number] = [
    (min[0] + max[0] + 1) / 2,
    min[1],
    (min[2] + max[2] + 1) / 2,
  ];
  const size = Math.max(max[0] - min[0], max[2] - min[2], 8);
  const position: [number, number, number] = [
    center[0],
    center[1] + size * 0.9,
    center[2] + size * 0.9,
  ];
  return { center, position };
}

function MapScene({ map, bounds, cutY }: MapSceneProps) {
  const chunks = useMemo(() => {
    const lookup = createBlockLookup(map.palette);
    return [...map.store.keys()].map((key) => ({
      key,
      ...buildChunkMesh(map.store, key, lookup, { cutY }),
    }));
  }, [map, cutY]);

  // Камеру выставляем один раз по границам карты; дальше ей управляет игрок.
  const { center, position } = useMemo(() => cameraFraming(bounds), [bounds]);

  return (
    <div className={classes.canvas}>
      <Canvas
        frameloop="demand"
        camera={{ position, fov: 45, near: 0.1, far: 5000 }}
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
        <MapControls target={center} makeDefault />
      </Canvas>
    </div>
  );
}

export default MapScene;
