import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import type { MapState } from 'shared';
import classes from '../MapScene.module.css';
import CreatureCard from '../objects/CreatureCard';
import { useObjectTextures } from '../objects/useObjectTextures';
import { layoutFigures, type FigureInput } from './figureLayout';

interface FigureLayerProps {
  map: MapState;
  figures: readonly FigureInput[];
  cutY: number;
}

// Фигурки персонажей на сцене игры (docs/plan/game.md, этап 7): стоячие карточки, как
// существа карты, с зелёной рамкой. Наведение показывает имя и не перехватывает событие.
function FigureLayer({ map, figures, cutY }: FigureLayerProps) {
  const all = useMemo(() => layoutFigures(map, figures), [map, figures]);
  const visible = all.filter((figure) => figure.level <= cutY);
  const paths = useMemo(
    () => all.flatMap((figure) => (figure.image ? [figure.image] : [])),
    [all],
  );
  const { textures } = useObjectTextures(paths);
  const invalidate = useThree((three) => three.invalidate);
  const [hovered, setHovered] = useState<string | null>(null);

  // Кадры рисуются по требованию: догрузившаяся текстура сама кадр не вызовет.
  useEffect(() => invalidate(), [textures, all, invalidate]);

  const tip = visible.find((figure) => figure.id === hovered);
  return (
    <>
      {visible.map((figure) => (
        <group
          key={figure.id}
          onPointerOver={() => setHovered(figure.id)}
          onPointerOut={() =>
            setHovered((prev) => (prev === figure.id ? null : prev))
          }
        >
          <CreatureCard
            object={figure}
            look={{
              kind: 'creature',
              side: 'pc',
              size: figure.size,
              facing: figure.facing,
              image: figure.image,
              letter: figure.letter,
              missing: false,
            }}
            texture={(figure.image && textures.get(figure.image)) || null}
          />
        </group>
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
