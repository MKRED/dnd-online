import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import {
  CREATURE_SIZES,
  creatureBody,
  creatureCells,
  type MapState,
} from 'shared';
import classes from '../MapScene.module.css';
import { useObjectTextures } from '../objects/useObjectTextures';
import GhostGroup from '../objects/GhostGroup';
import { facingAngle } from '../objects/objectLayout';
import {
  figureKey,
  TargetMarker,
  type AimPoint,
  type AimStore,
  type SceneAttackTargets,
} from '../targets';
import { figureWalkKey, WalkMotion, type SceneWalks } from '../walks';
import FigureBody from './FigureBody';
import {
  layoutFigures,
  type FigureInput,
  type SceneFigure,
} from './figureLayout';
import { useFigureDrag, type FigureDragHandlers } from './useFigureDrag';

interface FigureLayerProps extends FigureDragHandlers {
  map: MapState;
  figures: readonly FigureInput[];
  cutY: number;
  // Фигурки, которые сейчас тянут другие: полупрозрачные, там, где их держат.
  ghosts?: readonly FigureInput[];
  // Ходы по пути: фигурка прыгает по клеткам (docs/plan/done/walk-animation.md).
  walks?: SceneWalks;
  // Идёт выбор цели атаки: щелчок по фигурке-цели выбирает её, а не фигурку.
  targets?: SceneAttackTargets | null;
  // Луч дальней атаки: грудь атакующего и середины целей.
  aim?: AimStore;
}

// Фигурки персонажей на сцене игры (docs/plan/done/game.md, этап 7): стоячие карточки, как
// существа карты, с зелёной рамкой, или 3D-модель персонажа (docs/plan/done/character-models.md). Наведение показывает имя и не перехватывает событие;
// фигурку, которую смотрящий водит, выбирают щелчком и тянут мышью (useFigureDrag).
function FigureLayer({
  map,
  figures,
  cutY,
  ghosts,
  walks,
  targets = null,
  aim,
  onGrab,
  onRelease,
  onSelect,
  onOpen,
}: FigureLayerProps) {
  const all = useMemo(() => layoutFigures(map, figures), [map, figures]);
  const shadows = useMemo(
    () => layoutFigures(map, ghosts ?? []),
    [map, ghosts],
  );
  const drag = useFigureDrag({ onGrab, onRelease, onSelect, onOpen });
  const visible = all.filter((figure) => figure.level <= cutY);
  const paths = useMemo(
    () => all.flatMap((figure) => (figure.image ? [figure.image] : [])),
    [all],
  );
  const { textures } = useObjectTextures(paths);
  const invalidate = useThree((three) => three.invalidate);
  const [hovered, setHovered] = useState<string | null>(null);

  // Кадры рисуются по требованию: догрузившаяся текстура сама кадр не вызовет.
  useEffect(() => invalidate(), [textures, all, shadows, invalidate]);

  const markOf = (id: string) => targets?.marks.get(figureKey(id)) ?? null;
  usePlaceAimPoints(aim, targets, all, map);
  // Фигурку-цель не тянут: щелчок по ней — выбор цели.
  const handlers = (figure: SceneFigure) =>
    targets && markOf(figure.id)
      ? {
          onClick: (event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation();
            targets.pick(figureKey(figure.id));
          },
        }
      : drag(figure.id, figure.selectable);
  const tip = visible.find((figure) => figure.id === hovered);
  const card = (figure: (typeof all)[number], mark = false) => (
    <FigureBody
      figure={figure}
      mark={mark}
      texture={(figure.image && textures.get(figure.image)) || null}
    />
  );
  return (
    <>
      {visible.map((figure) => (
        <WalkMotion
          key={figure.id}
          walk={walks?.get(figureWalkKey(figure.id))}
          map={map}
          size={figure.size}
          base={figure.base}
          angle={facingAngle(figure.facing)}
        >
          <group
            {...handlers(figure)}
            onPointerOver={() => {
              setHovered(figure.id);
              if (markOf(figure.id)) aim?.hover(figureKey(figure.id));
            }}
            onPointerOut={() => {
              setHovered((prev) => (prev === figure.id ? null : prev));
              aim?.leave(figureKey(figure.id));
            }}
          >
            {card(figure, true)}
          </group>
        </WalkMotion>
      ))}
      {shadows.map((figure) => (
        // Обработчиков у тени нет — события проходят к клеткам под ней.
        <GhostGroup key={`ghost:${figure.id}`} active>
          {card(figure)}
        </GhostGroup>
      ))}
      {targets &&
        visible.map((figure) => {
          const mark = markOf(figure.id);
          const chosen = figureKey(figure.id) === targets.selectedKey;
          if (!mark || (!chosen && figure.id !== hovered)) return null;
          return (
            <TargetMarker
              key={`target:${figure.id}`}
              base={figure.base}
              footprint={figure.footprint}
              top={figure.top}
              mark={mark}
              selected={chosen}
            />
          );
        })}
      {tip && !markOf(tip.id) && (
        <Html
          position={[tip.base[0], tip.top + 0.3, tip.base[2]]}
          center
          className={classes.label}
        >
          {tip.name}
        </Html>
      )}
    </>
  );
}

// Точки фигурок для луча (targets/TargetBeam): у атакующего — грудь, откуда летит
// стрела, у целей — середина тела.
function usePlaceAimPoints(
  aim: AimStore | undefined,
  targets: SceneAttackTargets | null,
  figures: readonly SceneFigure[],
  map: MapState,
) {
  useEffect(() => {
    if (!aim || !targets) return;
    const points = new Map<string, AimPoint>();
    for (const figure of figures) {
      const key = figureKey(figure.id);
      const [x, y, z] = figure.base;
      const height = CREATURE_SIZES[figure.size].height;
      const attacker = key === targets.attackerKey;
      if (!attacker && !targets.marks.has(key)) continue;
      points.set(key, {
        point: [x, y + height * (attacker ? 0.7 : 0.5), z],
        cells: creatureCells(figure.at, figure.size),
        body: creatureBody(map, figure.at, figure.size),
      });
    }
    aim.place('figures', points);
  }, [aim, targets, figures, map]);
}

export default FigureLayer;
