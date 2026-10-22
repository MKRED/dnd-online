import { useId } from 'react';
import {
  MATERIALS,
  rotateBox,
  SHAPES,
  type MaterialName,
  type BlockTextures,
  type Rotation,
  type ShapeBox,
  type ShapeName,
} from 'shared';
import { ownTileImage, tileImage } from '../../render/textures/tileImages';
import { faceImageTransform, isoFaces, type IsoFaceKind } from './isoFaces';

const FULL_CELL: ShapeBox = [0, 0, 0, 1, 1, 1];

// Свет на значке, как на сцене: верх светлее, восточный бок в тени.
const SHADING: Record<IsoFaceKind, string> = {
  top: 'rgb(255 255 255 / 14%)',
  south: 'none',
  east: 'rgb(0 0 0 / 24%)',
};

export interface ShapeSwatchProps {
  material: MaterialName;
  shape: ShapeName;
  // Основной цвет своей группы блоков: узор основы перекрашен в него.
  color?: string;
  // Свои текстуры группы — вместо узора основы.
  textures?: BlockTextures | null;
  rotation?: Rotation;
  size?: number;
}

// Миниатюра блока: коробки формы в изометрии с текстурой материала
// (docs/plan/blocks.md, этап 1). Рисуется из тех же коробок, что и сцена
// (shared/map/shapes.ts), — новая форма получит миниатюру сама. Свой блок из
// справочника рисуется узором своей основы в своём основном цвете (этап 4).
function ShapeSwatch({
  material,
  shape,
  color = MATERIALS[material].color,
  textures,
  rotation = 0,
  size = 36,
}: ShapeSwatchProps) {
  // id обрезки граней — свои у каждого значка; двоеточия useId в url(#…) не годятся.
  const clipPrefix = `swatch${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const boxes = SHAPES[shape].map((box) => rotateBox(box, rotation));
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
      {shape !== 'cube' &&
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
              href={
                textures
                  ? ownTileImage(textures[face.kind === 'top' ? 'top' : 'side'])
                  : tileImage(
                      material,
                      face.kind === 'top' ? 'top' : 'side',
                      color,
                    )
              }
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

export default ShapeSwatch;
