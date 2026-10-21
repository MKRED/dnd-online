import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, Shape, type Texture } from 'three';
import { coffinOutline, type CoffinSize } from './creaturePose';

const WOOD = '#5a3a22';
const LID = '#74502f';

interface CoffinProps {
  size: CoffinSize;
  // Картинка существа (или буква); рамка вокруг неё — серая, как у заглушки.
  picture: Texture | null;
  frame: string;
}

// Плоская призма по контуру гроба: контур лежит в плоскости XY с y = −z, поворот на
// −90° вокруг x кладёт его на пол, а выдавливание (+z) становится высотой (+y).
function extrude(size: CoffinSize, scale: number, depth: number) {
  const shape = new Shape();
  coffinOutline(size).forEach(([x, z], i) =>
    i === 0
      ? shape.moveTo(x * scale, -z * scale)
      : shape.lineTo(x * scale, -z * scale),
  );
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
}

// Гроб поверженного существа (docs/dnd/hit-points.md, «Что видят другие»): низкий
// деревянный ящик во всё место, изголовьем по взгляду, крышка чуть шире, на ней —
// портрет в рамке, верх картинки к изголовью. Рисуется в повёрнутой по взгляду группе.
function Coffin({ size, picture, frame }: CoffinProps) {
  const lidThickness = size.height * 0.25;
  const bodyHeight = size.height - lidThickness;
  const body = useMemo(() => extrude(size, 1, bodyHeight), [size, bodyHeight]);
  const lid = useMemo(
    () => extrude(size, 1.06, lidThickness),
    [size, lidThickness],
  );
  useEffect(
    () => () => {
      body.dispose();
      lid.dispose();
    },
    [body, lid],
  );
  const portrait = size.width * 0.62;
  const top = size.height + 0.003;
  // Портрет ближе к изголовью: там гроб шире всего.
  const portraitZ = -size.length * 0.1;
  return (
    <group>
      <mesh geometry={body} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={WOOD} />
      </mesh>
      <mesh
        geometry={lid}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, bodyHeight, 0]}
      >
        <meshStandardMaterial color={LID} />
      </mesh>
      <mesh position={[0, top, portraitZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[portrait * 1.12, portrait * 1.12]} />
        <meshStandardMaterial color={frame} />
      </mesh>
      {picture && (
        <mesh
          position={[0, top + 0.002, portraitZ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[portrait, portrait]} />
          <meshBasicMaterial map={picture} alphaTest={0.05} />
        </mesh>
      )}
    </group>
  );
}

export default Coffin;
