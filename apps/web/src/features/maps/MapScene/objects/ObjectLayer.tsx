import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import type { MapObjectRefsView } from 'shared';
import type { ObjectToolScene } from '../../editor/objects';
import type { MapViewState } from '../../mapStateFromChunks';
import FrameBox from '../FrameBox';
import type { HoverStore } from '../hoverStore';
import classes from '../MapScene.module.css';
import ContainerShape from './ContainerShape';
import CreatureCard from './CreatureCard';
import FloorItem from './FloorItem';
import {
  layoutObjects,
  objectImagePaths,
  type SceneObject,
} from './objectLayout';
import StandBase, { BLOCKED_COLOR } from './StandBase';
import { useLabelTexture } from './useLabelTexture';
import { useObjectDrag } from './useObjectDrag';
import { useObjectTextures } from './useObjectTextures';

const START_COLOR = '#d9a01e';
const SELECTED_COLOR = '#4dabf7';

interface ObjectLayerProps {
  state: MapViewState;
  refs: MapObjectRefsView;
  cutY: number;
  // Все миниатюры загрузились или не загрузились — можно писать «Сцена готова».
  onImagesSettled: () => void;
  // Инструмент «Объекты»: выделение и перетаскивание; null — объекты не трогаются.
  tool: ObjectToolScene | null;
  // Клетка под курсором — туда переносится отпущенный объект.
  hover: HoverStore;
}

// Обводка выделенного объекта во всё его место и рост.
function SelectionFrame({ object }: { object: SceneObject }) {
  const half = object.footprint / 2;
  const [x, y, z] = object.base;
  return (
    <FrameBox
      min={[x - half, y, z - half]}
      max={[x + half, object.top, z + half]}
      color={SELECTED_COLOR}
      opacity={0.1}
    />
  );
}

function StartTile({
  object,
  number,
}: {
  object: SceneObject;
  number: number;
}) {
  const label = useLabelTexture(String(number), '#000a', true);
  return (
    <group position={object.base}>
      <StandBase
        size={1}
        color={object.blocked ? BLOCKED_COLOR : START_COLOR}
        facing={object.look.kind === 'start' ? object.look.facing : undefined}
        texture={label}
      />
    </group>
  );
}

// Объекты карты в сцене (docs/plan/map-objects.md, этапы 4 и 5). Наведение показывает
// подсказку с подписью и предупреждениями, но не перехватывает событие: клики по
// блокам за объектом работают, как раньше. Только инструмент «Объекты» забирает клик
// по объекту себе — выделить или перетащить.
function ObjectLayer({
  state,
  refs,
  cutY,
  onImagesSettled,
  tool,
  hover,
}: ObjectLayerProps) {
  const all = useMemo(() => layoutObjects(state, refs), [state, refs]);
  // Картинки — всех объектов, а не только ниже среза: иначе каждое движение ползунка
  // перезагружало бы текстуры.
  const paths = useMemo(() => objectImagePaths(all), [all]);
  const objects = useMemo(
    () => all.filter((object) => object.level <= cutY),
    [all, cutY],
  );
  const { textures, settled } = useObjectTextures(paths);
  const [hovered, setHovered] = useState<number | null>(null);
  const invalidate = useThree((three) => three.invalidate);
  const handlers = useObjectDrag(tool, hover);

  // Кадры рисуются по требованию: догрузившаяся текстура сама кадр не вызовет.
  useEffect(() => invalidate(), [textures, invalidate]);
  useEffect(() => {
    if (settled) onImagesSettled();
  }, [settled, onImagesSettled]);

  const texture = (path: string | null) =>
    (path !== null && textures.get(path)) || null;
  const tip = objects.find((object) => object.id === hovered);
  const selected =
    tool && objects.find((object) => object.id === tool.selectedId);

  return (
    <>
      {objects.map((object) => {
        const { look } = object;
        return (
          <group
            key={object.id}
            {...handlers(object.id)}
            onPointerOver={() => setHovered(object.id)}
            onPointerOut={() =>
              setHovered((prev) => (prev === object.id ? null : prev))
            }
          >
            {look.kind === 'creature' && (
              <CreatureCard
                object={object}
                look={look}
                texture={texture(look.image)}
              />
            )}
            {look.kind === 'start' && (
              <StartTile object={object} number={look.number} />
            )}
            {look.kind === 'container' && (
              <ContainerShape look={look.look} base={object.base} />
            )}
            {look.kind === 'item' && (
              <FloorItem
                object={object}
                look={look}
                texture={texture(look.image)}
              />
            )}
          </group>
        );
      })}
      {selected && <SelectionFrame object={selected} />}
      {tip && (
        <Html
          position={[tip.base[0], tip.top + 0.3, tip.base[2]]}
          center
          className={classes.label}
        >
          {tip.label}
          {tip.warnings.map((warning) => (
            <div key={warning} className={classes.labelWarning}>
              {warning}
            </div>
          ))}
        </Html>
      )}
    </>
  );
}

export default ObjectLayer;
