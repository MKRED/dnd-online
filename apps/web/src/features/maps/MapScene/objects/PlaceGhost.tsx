import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { CREATURE_SIZES, type Point3, type Vec3 } from 'shared';
import ContainerShape from './ContainerShape';
import CreatureBody from './CreatureBody';
import FacingNose from './FacingNose';
import FloorItem from './FloorItem';
import FurnitureFigure from './FurnitureFigure';
import GhostGroup from './GhostGroup';
import type { MapViewState } from '../../mapStateFromChunks';
import {
  objectFeet,
  type SceneObject,
  type SceneObjectLook,
} from './objectLayout';
import StandBase from './StandBase';
import { useObjectTextures } from './useObjectTextures';

const START_COLOR = '#d9a01e';
const NOSE_COLOR = '#ffd43b';

interface PlaceGhostProps {
  look: SceneObjectLook;
  // Клетка места (угол с наименьшими x и z) и его размер в клетках.
  at: Vec3;
  extent: Vec3;
  // Карта — по ней высота, на которую объект встанет (ступени, плиты); без неё — пол клетки.
  map: MapViewState | null;
}

// Что поставит щелчок: сам объект полупрозрачно, уже повёрнутый, и носик взгляда спереди
// (вариант В артборда «Н1», 2026-10-24, docs/plan/done/scene-page.md). Стоит на той же высоте,
// что объект после щелчка: на ступени или плите — сверху (objectFeet, как в layoutObjects).
function PlaceGhost({ look, at, extent, map }: PlaceGhostProps) {
  const [x, y, z] = at;
  // Обстановка стоит дном на нижнем уровне своих клеток (этап 8в плана блоков).
  const feet = map && look.kind !== 'furniture' ? objectFeet(map, look, at) : y;
  const [ex, , ez] = extent;
  const footprint =
    look.kind === 'creature' ? CREATURE_SIZES[look.size].footprint : 1;
  const middle = look.kind === 'creature' ? Math.max(footprint, 1) / 2 : 0.5;
  const base: Point3 =
    look.kind === 'furniture'
      ? [x + ex / 2, feet, z + ez / 2]
      : [x + middle, feet, z + middle];
  const object: SceneObject = {
    id: -1,
    at,
    level: y,
    base,
    footprint,
    top: feet + extent[1],
    label: '',
    warnings: [],
    blocked: false,
    hidden: true,
    look,
  };
  const image =
    look.kind === 'creature' || look.kind === 'item' ? look.image : null;
  const paths = useMemo(() => (image ? [image] : []), [image]);
  const { textures } = useObjectTextures(paths);
  const texture = (image && textures.get(image)) || null;
  // Кадры рисуются по требованию: догрузившаяся картинка сама кадр не вызовет.
  const invalidate = useThree((three) => three.invalidate);
  useEffect(() => invalidate(), [texture, invalidate]);

  const facing = 'facing' in look ? look.facing : null;
  return (
    <>
      {/* Ключ по виду: другой выбор — новые материалы, призрак красит их заново. */}
      <GhostGroup key={look.kind} active>
        {look.kind === 'creature' && (
          <CreatureBody
            object={object}
            look={look}
            texture={texture}
            health={null}
            mark={false}
          />
        )}
        {look.kind === 'start' && (
          <group position={base}>
            <StandBase size={1} color={START_COLOR} facing={look.facing} />
          </group>
        )}
        {look.kind === 'container' && (
          <ContainerShape look={look.look} facing={look.facing} base={base} />
        )}
        {look.kind === 'furniture' && (
          <FurnitureFigure object={object} look={look} />
        )}
        {look.kind === 'item' && (
          <FloorItem object={object} look={look} texture={texture} />
        )}
      </GhostGroup>
      {facing !== null && (
        <FacingNose
          base={base}
          half={[ex / 2, ez / 2]}
          facing={facing}
          color={NOSE_COLOR}
        />
      )}
    </>
  );
}

export default PlaceGhost;
