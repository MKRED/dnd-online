import type { ThreeEvent } from '@react-three/fiber';
import { useState, type ReactNode } from 'react';
import type { Box3, Vec3 } from 'shared';
import {
  cellsFromHit,
  regionBox,
  toolCell,
  type PickedCells,
  type SceneEditor,
} from '../editor/editorTools';
import FrameBox from './FrameBox';
import WalkHoverMesh from './WalkHoverMesh';

interface EditLayerProps {
  editor: SceneEditor | null;
  // Кадр карты: вокруг него рисуется сетка земли.
  frame: Box3;
  // Меши чанков — по ним идёт выбор клеток.
  children: ReactNode;
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
function CellHighlight({
  editor,
  pick,
}: {
  editor: SceneEditor;
  pick: PickedCells;
}) {
  const cell = toolCell(editor.tool, pick);
  if (!cell) return null;
  const box: Box3 = editor.anchor
    ? regionBox(editor.anchor, cell, editor.height)
    : { min: cell, max: cell };
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
function EditLayer({ editor, frame, children }: EditLayerProps) {
  const [hover, setHover] = useState<PickedCells | null>(null);

  const updateHover = (pick: PickedCells | null) =>
    setHover((prev) => (samePick(prev, pick) ? prev : pick));

  // Сетка земли: чётный размер и целый центр — линии лягут по границам клеток.
  const half = Math.ceil(
    Math.max(frame.max[0] - frame.min[0], frame.max[2] - frame.min[2]) / 2 + 16,
  );
  const cx = Math.round((frame.min[0] + frame.max[0] + 1) / 2);
  const cz = Math.round((frame.min[2] + frame.max[2] + 1) / 2);

  return (
    <>
      {/* Группа одна и та же в обоих режимах: смена инструмента не пересоздаёт меши чанков. */}
      <group
        onPointerMove={
          editor
            ? (event) => {
                event.stopPropagation();
                updateHover(pickFrom(event));
              }
            : undefined
        }
        onPointerOut={editor ? () => updateHover(null) : undefined}
        onClick={
          editor
            ? (event) => {
                event.stopPropagation();
                if (event.delta > DRAG_THRESHOLD) return;
                editor.onPick(pickFrom(event));
              }
            : undefined
        }
      >
        {children}
        {editor && (
          <mesh
            visible={false}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[cx, 0, cz]}
            userData={{ ground: true }}
          >
            <planeGeometry args={[half * 2, half * 2]} />
          </mesh>
        )}
      </group>
      {editor && (
        <gridHelper
          args={[half * 2, half * 2, '#5a5f6a', '#363a42']}
          position={[cx, 0.002, cz]}
          raycast={() => null}
        />
      )}
      {editor &&
        hover &&
        (editor.preview ? (
          <WalkHoverMesh hover={editor.preview(hover)} />
        ) : (
          <CellHighlight editor={editor} pick={hover} />
        ))}
    </>
  );
}

export default EditLayer;
