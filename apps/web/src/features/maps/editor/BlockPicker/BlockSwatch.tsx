import { getBlock, MATERIALS, rotateBox, SHAPES, type Rotation } from 'shared';
import { isoFaces } from './isoFaces';

interface BlockSwatchProps {
  block: string;
  rotation?: Rotation;
  size?: number;
}

// Миниатюра блока: коробки его формы в изометрии, цветом материала. Рисуется из тех же
// коробок, что и сцена (shared/map/shapes.ts), — новая форма получит миниатюру сама.
function BlockSwatch({ block, rotation = 0, size = 36 }: BlockSwatchProps) {
  const definition = getBlock(block);
  if (!definition) return null;
  const color = MATERIALS[definition.material].color;
  const boxes = SHAPES[definition.shape].map((box) => rotateBox(box, rotation));
  return (
    <svg
      width={size}
      height={size}
      viewBox="-1 -1.25 2 2.1"
      aria-hidden
      style={{ flex: 'none' }}
    >
      {isoFaces(boxes, color).map((face, index) => (
        <polygon
          key={index}
          points={face.points}
          fill={face.fill}
          stroke="rgb(0 0 0 / 35%)"
          strokeWidth={0.03}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export default BlockSwatch;
