import type { WalkScene } from '../walkTest';
import FrameBox from './FrameBox';
import ReachTiles from './ReachTiles';

// Проверка хода в сцене: фигурка — коробка тела существа (видно, как оно встаёт
// в проёмы; красная, если стоять тут уже нельзя) — и плитки «куда могу дойти».
function WalkLayer({ walk }: { walk: WalkScene }) {
  const { token, tiles, budget } = walk;
  return (
    <>
      <FrameBox
        min={token.body.min}
        max={token.body.max}
        color={token.ok ? '#4dabf7' : '#ff6b6b'}
        opacity={0.45}
      />
      <ReachTiles tiles={tiles} budget={budget} />
    </>
  );
}

export default WalkLayer;
