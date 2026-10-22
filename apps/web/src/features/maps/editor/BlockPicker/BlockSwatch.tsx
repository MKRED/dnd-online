import {
  getBlock,
  MATERIALS,
  rotateBox,
  SHAPES,
  type Rotation,
  type ShapeBox,
} from 'shared';
import { isoFaces } from './isoFaces';

const FULL_CELL: ShapeBox = [0, 0, 0, 1, 1, 1];

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
      {/* Контур всей клетки — у неполных форм видно, где в клетке лежит деталь:
          плита внизу или вверху, стена у северного края. */}
      {definition.shape !== 'cube' &&
        isoFaces([FULL_CELL], color).map((face, index) => (
          <polygon
            key={`cell-${index}`}
            points={face.points}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.3}
            strokeWidth={0.03}
            strokeDasharray="0.08 0.06"
          />
        ))}
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
