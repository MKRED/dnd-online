import { Edges } from '@react-three/drei';
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

// Подсветка клеток для редактора: под курсором и область от первого угла.
function Highlight({ box, color }: { box: Box3; color: string }) {
  const { min, max } = box;
  const size: Vec3 = [
    max[0] - min[0] + 1,
    max[1] - min[1] + 1,
    max[2] - min[2] + 1,
  ];
  // Чуть больше клеток, чтобы рамка не мерцала, совпадая с гранями блоков.
  const scale: Vec3 = [size[0] + 0.02, size[1] + 0.02, size[2] + 0.02];
  const center: Vec3 = [
    min[0] + size[0] / 2,
    min[1] + size[1] / 2,
    min[2] + size[2] / 2,
  ];
  return (
    <mesh position={center} scale={scale} raycast={() => null}>
      <boxGeometry />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.15}
        depthWrite={false}
      />
      <Edges color={color} />
    </mesh>
  );
}

// Слой редактора: клики по блокам и земле превращаются в выбор клеток.
// Наведение живёт здесь, а не на странице: иначе каждое движение мыши
// перерисовывало бы всю страницу с панелью.
function EditLayer({ editor, frame, children }: EditLayerProps) {
  const [hover, setHover] = useState<Vec3 | null>(null);

  const updateHover = (cell: Vec3 | null) =>
    setHover((prev) => (sameCell(prev, cell) ? prev : cell));

  // Сетка земли: чётный размер и целый центр — линии лягут по границам клеток.
  const half = Math.ceil(
    Math.max(frame.max[0] - frame.min[0], frame.max[2] - frame.min[2]) / 2 + 16,
  );
  const cx = Math.round((frame.min[0] + frame.max[0] + 1) / 2);
  const cz = Math.round((frame.min[2] + frame.max[2] + 1) / 2);

  const box =
    editor &&
    hover &&
    (editor.anchor
      ? regionBox(editor.anchor, hover, editor.height)
      : { min: hover, max: hover });

  return (
    <>
      {/* Группа одна и та же в обоих режимах: смена инструмента не пересоздаёт меши чанков. */}
      <group
        onPointerMove={
          editor
            ? (event) => {
                event.stopPropagation();
                updateHover(toolCell(editor.tool, pickFrom(event)));
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
      {box && (
        <Highlight
          box={box}
          color={editor.tool === 'erase' ? '#ff6b6b' : '#ffd43b'}
        />
      )}
    </>
  );
}

export default EditLayer;
