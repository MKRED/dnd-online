import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, Shape } from 'three';
import { coffinOutline, type CoffinSize } from './creaturePose';
import { skullTexture } from './skullTexture';

const WOOD = '#5a3a22';
const LID = '#74502f';

interface CoffinProps {
  size: CoffinSize;
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
// деревянный ящик во всё место, ногами по взгляду, крышка чуть шире, на ней — череп,
// верхом к изголовью. Портрет — только у призрака над гробом. Рисуется в повёрнутой
// по взгляду группе; контур (coffinOutline) — изголовьем к −z, поэтому гроб развёрнут.
function Coffin({ size }: CoffinProps) {
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
  const skull = skullTexture();
  const skullSize = size.width * 0.7;
  // Череп ближе к изголовью: там гроб шире всего.
  const skullZ = -size.length * 0.12;
  return (
    <group rotation={[0, Math.PI, 0]}>
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
      {skull && (
        <mesh
          position={[0, size.height + 0.003, skullZ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[skullSize, skullSize]} />
          <meshStandardMaterial map={skull} transparent alphaTest={0.05} />
        </mesh>
      )}
    </group>
  );
}

export default Coffin;
