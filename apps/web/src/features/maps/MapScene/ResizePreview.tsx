import { Edges } from '@react-three/drei';
import { resizeShift, type MapSize, type ResizeOp } from 'shared';

interface ResizePreviewProps {
  size: MapSize;
  grow: ResizeOp['grow'];
}

const COLOR = '#4dabf7';

// Новая граница карты до «Применить», в нынешних координатах: блоки ещё не сдвинуты,
// поэтому рост на запад и север уходит в минус. Новые уровни снизу (или срезаемые)
// показаны высотой коробки ниже (или выше) земли. Рёбра рисуются поверх блоков:
// иначе граница, проходящая сквозь пол карты, пряталась бы в нём.
function ResizePreview({ size, grow }: ResizePreviewProps) {
  const [west, down, north] = resizeShift(grow);
  const min = [-west, Math.min(0, -down), -north];
  const max = [
    size.width + (grow.east ?? 0),
    Math.max(0, -down),
    size.depth + (grow.south ?? 0),
  ];
  const center = min.map((v, axis) => (v + max[axis]) / 2);
  // Плоская коробка (низ не меняется) — всё равно чуть толще нуля, чтобы были рёбра.
  const scale = min.map((v, axis) => Math.max(max[axis] - v, 0.02));
  return (
    <mesh
      position={center as [number, number, number]}
      scale={scale as [number, number, number]}
      raycast={() => null}
      renderOrder={1}
    >
      <boxGeometry />
      <meshBasicMaterial
        color={COLOR}
        transparent
        opacity={0.08}
        depthWrite={false}
      />
      <Edges color={COLOR} depthTest={false} renderOrder={2} />
    </mesh>
  );
}

export default ResizePreview;
