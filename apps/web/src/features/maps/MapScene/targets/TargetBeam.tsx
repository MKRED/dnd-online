import { Html, Line } from '@react-three/drei';
import { useSyncExternalStore } from 'react';
import {
  attackLine,
  boxDistance,
  cellsToFeet,
  pointInSolid,
  type MapState,
  type Point3,
  type Vec3,
} from 'shared';
import type { HoverStore } from '../hoverStore';
import classes from '../MapScene.module.css';
import type { AimStore } from './aimStore';
import { TONE_COLORS, type SceneAttackTargets } from './sceneTargets';

const EMPTY_COLOR = '#f8f9fa';

interface TargetBeamProps {
  map: MapState;
  targets: SceneAttackTargets;
  aim: AimStore;
  hover: HoverStore;
}

// Луч дальней атаки, как в BG3 (решение Михаила 2026-10-28, вопрос 4А): на цели (под
// курсором, иначе выбранной) — сплошной, цвета «можно / с помехой / нельзя», и проведён
// тем же расчётом, что укрытие на сервере (attackLine, ответ Михаила 2026-10-28): из
// точки глаз с лучшим укрытием к открытой точке тела цели, так что сквозь стену он не
// идёт, а за полным укрытием его нет. Над пустым местом — пунктир от груди до клетки
// под курсором и расстояние до неё.
function TargetBeam({ map, targets, aim, hover }: TargetBeamProps) {
  useSyncExternalStore(aim.subscribe, aim.version);
  const cell = useSyncExternalStore(hover.subscribe, hover.get);
  const from = aim.point(targets.attackerKey);
  if (!from) return null;

  const key = aim.hovered() ?? targets.selectedKey;
  const mark = key ? targets.marks.get(key) : undefined;
  const target = key && mark ? aim.point(key) : null;
  if (target && mark) {
    // Линии нет — цель за полным укрытием: строка над целью скажет почему.
    const line = attackLine(map, from.body, target.body, 'effect');
    return line ? (
      <Beam from={line.from} to={line.to} color={TONE_COLORS[mark.tone]} />
    ) : null;
  }
  if (!cell) return null;
  // Под курсором блок — луч ложится на его верх, а расстояние — до клетки над ним, где
  // стояло бы существо. Пустая клетка — на её дно. Середина блока ушла бы внутрь пола.
  const solid = pointInSolid(map, [
    cell[0] + 0.5,
    cell[1] + 0.5,
    cell[2] + 0.5,
  ]);
  const spot: Vec3 = solid ? [cell[0], cell[1] + 1, cell[2]] : cell;
  const to: Point3 = [spot[0] + 0.5, spot[1] + 0.02, spot[2] + 0.5];
  const feet = cellsToFeet(boxDistance(from.cells, { min: spot, max: spot }));
  return (
    <>
      <Beam from={from.point} to={to} color={EMPTY_COLOR} dashed />
      <Html position={to} className={classes.label} style={{ marginLeft: 14 }}>
        {feet} фт.
      </Html>
    </>
  );
}

interface BeamProps {
  from: Point3;
  to: Point3;
  color: string;
  dashed?: boolean;
}

function Beam({ from, to, color, dashed = false }: BeamProps) {
  return (
    <>
      <Line
        points={[from, to]}
        color={color}
        lineWidth={dashed ? 2 : 4}
        dashed={dashed}
        dashSize={0.25}
        gapSize={0.25}
        raycast={() => null}
      />
      <mesh position={to} raycast={() => null}>
        <sphereGeometry args={[0.12, 12, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
}

export default TargetBeam;
