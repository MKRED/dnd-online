import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import type { MapState } from 'shared';
import classes from '../MapScene.module.css';
import { useObjectTextures } from '../objects/useObjectTextures';
import GhostGroup from '../objects/GhostGroup';
import FigureBody from './FigureBody';
import { layoutFigures, type FigureInput } from './figureLayout';
import { useFigureDrag, type FigureDragHandlers } from './useFigureDrag';

interface FigureLayerProps extends FigureDragHandlers {
  map: MapState;
  figures: readonly FigureInput[];
  cutY: number;
  // Фигурки, которые сейчас тянут другие: полупрозрачные, там, где их держат.
  ghosts?: readonly FigureInput[];
}

// Фигурки персонажей на сцене игры (docs/plan/done/game.md, этап 7): стоячие карточки, как
// существа карты, с зелёной рамкой, или 3D-модель персонажа (docs/plan/character-models.md). Наведение показывает имя и не перехватывает событие;
// фигурку, которую смотрящий водит, выбирают щелчком и тянут мышью (useFigureDrag).
function FigureLayer({
  map,
  figures,
  cutY,
  ghosts,
  onGrab,
  onRelease,
  onSelect,
}: FigureLayerProps) {
  const all = useMemo(() => layoutFigures(map, figures), [map, figures]);
  const shadows = useMemo(
    () => layoutFigures(map, ghosts ?? []),
    [map, ghosts],
  );
  const drag = useFigureDrag({ onGrab, onRelease, onSelect });
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
        <group
          key={figure.id}
          {...drag(figure.id, figure.selectable)}
          onPointerOver={() => setHovered(figure.id)}
          onPointerOut={() =>
            setHovered((prev) => (prev === figure.id ? null : prev))
          }
        >
          {card(figure, true)}
        </group>
      ))}
      {shadows.map((figure) => (
        // Обработчиков у тени нет — события проходят к клеткам под ней.
        <GhostGroup key={`ghost:${figure.id}`} active>
          {card(figure)}
        </GhostGroup>
      ))}
      {tip && (
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

export default FigureLayer;
