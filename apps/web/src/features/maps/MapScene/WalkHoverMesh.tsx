import { Html, Line } from '@react-three/drei';
import type { WalkHover, WalkHoverKind } from '../walkTest';
import FrameBox from './FrameBox';
import classes from './MapScene.module.css';

const COLORS: Record<WalkHoverKind, string> = {
  move: '#51cf66',
  place: '#ff922b',
  blocked: '#ff6b6b',
};

// Подсветка проверки хода под курсором: тело там, где встанет фигурка (зелёное —
// дойдёт, оранжевое — только переставить, красное — стоять нельзя), а для хода —
// линия пути и его цена над телом.
function WalkHoverMesh({ hover }: { hover: WalkHover | null }) {
  if (!hover) return null;
  const { body, kind, line, cost } = hover;
  const color = COLORS[kind];
  return (
    <>
      <FrameBox min={body.min} max={body.max} color={color} />
      {line.length > 1 && (
        <Line points={line} color={color} lineWidth={3} raycast={() => null} />
      )}
      {kind === 'move' && (
        <Html
          position={[
            (body.min[0] + body.max[0]) / 2,
            body.max[1] + 0.3,
            (body.min[2] + body.max[2]) / 2,
          ]}
          center
          className={classes.label}
        >
          {cost} фт
        </Html>
      )}
    </>
  );
}

export default WalkHoverMesh;
