import type { ThreeEvent } from '@react-three/fiber';
import { useState, type ReactNode } from 'react';
import { insideMap, type Box3, type MapSize, type Vec3 } from 'shared';
import type { Point } from '../cameraView';
import { readoutCell } from '../editor/cellReadout';
import {
  cellsFromHit,
  regionBox,
  spanAnchor,
  toolCell,
  type PickedCells,
  type SceneEditor,
} from '../editor/editorTools';
import FrameBox from './FrameBox';
import GroundGrid from './GroundGrid';
import type { HoverStore } from './hoverStore';
import WalkHoverMesh from './WalkHoverMesh';

interface EditLayerProps {
  editor: SceneEditor | null;
  // Размер карты: по нему земля, сетка и граница.
  size: MapSize;
  // Меши чанков — по ним идёт выбор клеток.
  children: ReactNode;
  // Перенести центр камеры в точку: двойной клик в «Просмотре», Alt+клик в любом инструменте.
  onFocus: (point: Point) => void;
  // Клетка под курсором для строки координат — при любом инструменте, и в «Просмотре».
  readout: HoverStore;
}

// Сдвиг мыши (px) между нажатием и отпусканием, после которого клик считается
// перетаскиванием камеры, а не правкой.
const DRAG_THRESHOLD = 4;

const sameCell = (a: Vec3 | null, b: Vec3 | null) =>
  a === b || (!!a && !!b && a.every((v, i) => v === b[i]));

function pickFrom(event: ThreeEvent<PointerEvent | MouseEvent>): PickedCells {
  const { point, face, object } = event;
  const ground = object.userData.ground === true;
  // Меши чанков без трансформаций — нормаль грани уже мировая. У земли (повёрнутая
  // плоскость) локальная нормаль другая, но её и так знаем: вверх.
  const normal = ground || !face ? [0, 1, 0] : face.normal.toArray();
  return cellsFromHit(
    point.toArray(),
    normal as [number, number, number],
    ground,
  );
}

// Половина клетки по x и z, в которой лежит точка попадания: «Ход» смещает тело
// крупного существа в ту сторону, куда наведён курсор, так что наведение должно
// обновляться и при переходе в другую половину той же клетки.
const sameHalf = (a: PickedCells, b: PickedCells) =>
  [0, 2].every(
    (axis) => Math.floor(a.point[axis] * 2) === Math.floor(b.point[axis] * 2),
  );

const samePick = (a: PickedCells | null, b: PickedCells | null) =>
  a === b ||
  (!!a &&
    !!b &&
    sameCell(a.hit, b.hit) &&
    sameCell(a.place, b.place) &&
    sameHalf(a, b));

// Подсветка клеток инструмента: область от первого угла или одна клетка.
// Клетку за границей карты (боковая грань у края, низ блока на земле) не подсвечиваем:
// правку туда редактор и не отправит.
function CellHighlight({
  editor,
  pick,
  size,
}: {
  editor: SceneEditor;
  pick: PickedCells;
  size: MapSize;
}) {
  const cell = toolCell(editor.tool, pick);
  if (!cell || !insideMap(cell, size)) return null;
  const span = editor.span ?? 1;
  const from = spanAnchor(cell, span);
  const to: Vec3 = [from[0] + span - 1, from[1], from[2] + span - 1];
  // Место крупного существа целиком: не влезает в карту — не подсвечиваем.
  if (!insideMap(from, size) || !insideMap(to, size)) return null;
  const box: Box3 = editor.anchor
    ? regionBox(editor.anchor, cell, editor.height)
    : { min: from, max: to };
  return (
    <FrameBox
      min={box.min}
      max={[box.max[0] + 1, box.max[1] + 1, box.max[2] + 1]}
      color={editor.tool === 'erase' ? '#ff6b6b' : '#ffd43b'}
    />
  );
}

// Слой редактора: клики по блокам и земле превращаются в выбор клеток.
// Наведение живёт здесь, а не на странице: иначе каждое движение мыши
// перерисовывало бы всю страницу с панелью.
function EditLayer({
  editor,
  size,
  children,
  onFocus,
  readout,
}: EditLayerProps) {
  const [hover, setHover] = useState<PickedCells | null>(null);

  const updateHover = (pick: PickedCells | null) => {
    setHover((prev) => (samePick(prev, pick) ? prev : pick));
    editor?.onHover?.(pick);
  };

  return (
    <>
      {/* Группа одна и та же в обоих режимах: смена инструмента не пересоздаёт меши чанков. */}
      <group
        onPointerMove={(event) => {
          event.stopPropagation();
          const pick = pickFrom(event);
          const cell = readoutCell(editor?.tool ?? 'view', pick);
          readout.set(cell && insideMap(cell, size) ? cell : null);
          if (editor) updateHover(pick);
        }}
        onPointerOut={() => {
          readout.set(null);
          if (editor) updateHover(null);
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta > DRAG_THRESHOLD) return;
          // Alt+клик только переносит центр и ничего не правит: первый клик двойного
          // в инструменте уже поставил бы блок, поэтому там центр — на Alt
          // (docs/plan/done/map-editor.md, «Камера: двойной клик и Q/E»).
          if (event.altKey) onFocus(event.point.toArray());
          else editor?.onPick(pickFrom(event));
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (!editor) onFocus(event.point.toArray());
        }}
      >
        {children}
        {/* Земля нужна и в «Просмотре»: двойной клик по ней переносит центр на пустую клетку. */}
        <mesh
          visible={false}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[size.width / 2, 0, size.depth / 2]}
          userData={{ ground: true }}
        >
          <planeGeometry args={[size.width, size.depth]} />
        </mesh>
      </group>
      <GroundGrid size={size} showGrid={editor !== null} />
      {editor &&
        hover &&
        (editor.preview ? (
          <WalkHoverMesh hover={editor.preview(hover)} />
        ) : (
          <CellHighlight editor={editor} pick={hover} size={size} />
        ))}
    </>
  );
}

export default EditLayer;
