import { useId } from 'react';
import {
  getBlock,
  MATERIALS,
  rotateBox,
  SHAPES,
  type Rotation,
  type ShapeBox,
} from 'shared';
import { tileImage } from '../../render/textures/tileImages';
import { faceImageTransform, isoFaces, type IsoFaceKind } from './isoFaces';

const FULL_CELL: ShapeBox = [0, 0, 0, 1, 1, 1];

// Свет на значке, как на сцене: верх светлее, восточный бок в тени.
const SHADING: Record<IsoFaceKind, string> = {
  top: 'rgb(255 255 255 / 14%)',
  south: 'none',
  east: 'rgb(0 0 0 / 24%)',
};

interface BlockSwatchProps {
  block: string;
  rotation?: Rotation;
  size?: number;
}

// Миниатюра блока: коробки его формы в изометрии с текстурой материала
// (docs/plan/blocks.md, этап 1). Рисуется из тех же коробок, что и сцена
// (shared/map/shapes.ts), — новая форма получит миниатюру сама.
function BlockSwatch({ block, rotation = 0, size = 36 }: BlockSwatchProps) {
  // id обрезки граней — свои у каждого значка; двоеточия useId в url(#…) не годятся.
  const clipPrefix = `swatch${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const definition = getBlock(block);
  if (!definition) return null;
  const { material } = definition;
  const color = MATERIALS[material].color;
  const boxes = SHAPES[definition.shape].map((box) => rotateBox(box, rotation));
  const faces = isoFaces(boxes, color);
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
      <defs>
        {faces.map((face, index) => (
          <clipPath key={index} id={`${clipPrefix}-${index}`}>
            <polygon points={face.points} />
          </clipPath>
        ))}
      </defs>
      {faces.map((face, index) => (
        <g key={index}>
          <g clipPath={`url(#${clipPrefix}-${index})`}>
            <image
              href={tileImage(material, face.kind === 'top' ? 'top' : 'side')}
              width={1}
              height={1}
              preserveAspectRatio="none"
              transform={faceImageTransform(face)}
              style={{ imageRendering: 'pixelated' }}
            />
          </g>
          <polygon
            points={face.points}
            fill={SHADING[face.kind]}
            stroke="rgb(0 0 0 / 35%)"
            strokeWidth={0.03}
            strokeLinejoin="round"
          />
        </g>
      ))}
    </svg>
  );
}

export default BlockSwatch;
