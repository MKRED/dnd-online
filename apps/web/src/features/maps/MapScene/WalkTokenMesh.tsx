import type { WalkToken } from '../walkTest';
import FrameBox from './FrameBox';

// Фигурка проверки хода — коробка тела существа: видно, как оно встаёт в проёмы.
// Красная, если после правки карты или смены размера стоять тут нельзя.
function WalkTokenMesh({ token }: { token: WalkToken }) {
  return (
    <FrameBox
      min={token.body.min}
      max={token.body.max}
      color={token.ok ? '#4dabf7' : '#ff6b6b'}
      opacity={0.45}
    />
  );
}

export default WalkTokenMesh;
