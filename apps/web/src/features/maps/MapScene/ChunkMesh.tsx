import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import type { MeshBuffers } from '../render/buildChunkMesh';

interface ChunkMeshProps {
  buffers: MeshBuffers;
  transparent: boolean;
}

function ChunkMesh({ buffers, transparent }: ChunkMeshProps) {
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute('position', new BufferAttribute(buffers.positions, 3));
    result.setAttribute('normal', new BufferAttribute(buffers.normals, 3));
    result.setAttribute('color', new BufferAttribute(buffers.colors, 3));
    result.setIndex(new BufferAttribute(buffers.indices, 1));
    result.computeBoundingSphere();
    return result;
  }, [buffers]);

  // R3F не освобождает геометрию, заменённую через проп, — при каждой пересборке
  // (срез по высоте, новые данные) старая осталась бы в памяти видеокарты.
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshLambertMaterial
        vertexColors
        transparent={transparent}
        opacity={transparent ? 0.5 : 1}
        depthWrite={!transparent}
      />
    </mesh>
  );
}

export default ChunkMesh;
