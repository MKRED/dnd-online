import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import type { CreatureSize, MapState, Point3 } from 'shared';
import { standBase } from '../figures/figureLayout';
import type { SceneWalk } from './sceneWalk';
import { walkPoints } from './walkPoints';
import { walkPose } from './walkPose';

interface WalkMotionProps {
  walk: SceneWalk | undefined;
  map: MapState;
  size: CreatureSize;
  // Где существо стоит по данным и куда смотрит (facingAngle) — так рисуются children.
  base: Point3;
  angle: number;
  children: ReactNode;
}

// Как быстро фигурка доворачивается к новому шагу: доля оставшегося угла за секунду.
const TURN_RATE = 18;

// Разница углов в пределах (−π, π]: поворот идёт короткой дорогой.
function angleDiff(from: number, to: number) {
  const d = (to - from) % (Math.PI * 2);
  return d > Math.PI ? d - Math.PI * 2 : d <= -Math.PI ? d + Math.PI * 2 : d;
}

// Фигурка, монстр или НПС, идущие по пути (docs/plan/done/walk-animation.md). children
// рисуются как обычно — на месте из данных; эта обёртка переносит их в позу хода и
// поворачивает вокруг вертикали через base. Без хода — ничего не меняет. Кадры при ходе
// просит сама, с полной частотой, как движение камеры: ход короткий, не дольше 2 секунд.
function WalkMotion({
  walk,
  map,
  size,
  base,
  angle,
  children,
}: WalkMotionProps) {
  const outer = useRef<Group>(null);
  const invalidate = useThree((three) => three.invalidate);
  const points = useMemo(
    () => (walk?.kind === 'walk' ? walkPoints(map, walk.path, size) : null),
    [walk, map, size],
  );
  const hold = useMemo(
    () => (walk?.kind === 'hold' ? standBase(map, walk.at, size).base : null),
    [walk, map, size],
  );
  // Текущий поворот фигурки: доворачивается к шагу плавно, а не рывком.
  const heading = useRef<number | null>(null);

  // Кадры по требованию: пришедший путь сам первый кадр не вызовет.
  useEffect(() => invalidate(), [walk, invalidate]);

  useFrame((_, delta) => {
    const group = outer.current;
    if (!group) return;
    if (!walk) {
      group.position.set(...base);
      group.rotation.set(0, 0, 0);
      group.visible = true;
      heading.current = null;
      return;
    }
    let position: Point3 = hold ?? base;
    let target = angle;
    let visible = true;
    let moving = false;
    if (points) {
      const pose = walkPose(points, performance.now() - walk.startedAt);
      position = pose.position;
      // Между шагами и после хода — взгляд последнего шага: с ним сервер и ставит
      // существо, а данные у других могут прийти позже пути.
      target = pose.heading ?? heading.current ?? angle;
      visible = pose.visible;
      moving = !pose.done;
    }
    const current = heading.current ?? angle;
    const turn = angleDiff(current, target);
    heading.current =
      current + turn * Math.min(1, 1 - Math.exp(-delta * TURN_RATE));
    group.position.set(...position);
    group.rotation.set(0, heading.current - angle, 0);
    group.visible = visible;
    if (moving || Math.abs(turn) > 0.001) invalidate();
  });

  // Внутренняя группа сдвигает children так, что base оказывается в начале координат:
  // внешняя ставит его в позу хода и поворачивает вокруг него.
  return (
    <group ref={outer} position={base}>
      <group position={[-base[0], -base[1], -base[2]]}>{children}</group>
    </group>
  );
}

export default WalkMotion;
