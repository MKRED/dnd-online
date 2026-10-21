import { Html } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import {
  creatureHealthLabel,
  type CreatureHealth,
  type MapObjectRefsView,
} from 'shared';
import type { ObjectToolScene } from '../../editor/objects';
import type { MapViewState } from '../../mapStateFromChunks';
import FrameBox from '../FrameBox';
import type { HoverStore } from '../hoverStore';
import classes from '../MapScene.module.css';
import ContainerShape from './ContainerShape';
import CreatureCard from './CreatureCard';
import FloorItem from './FloorItem';
import GhostGroup from './GhostGroup';
import HealthMark from './HealthMark';
import {
  layoutObjects,
  objectImagePaths,
  type SceneObject,
} from './objectLayout';
import type { ObjectImagePaths } from './objectImages';
import StandBase, { BLOCKED_COLOR } from './StandBase';
import { useLabelTexture } from './useLabelTexture';
import { useObjectDrag } from './useObjectDrag';
import { useObjectTextures } from './useObjectTextures';

const START_COLOR = '#d9a01e';
const SELECTED_COLOR = '#4dabf7';

// Монстры и НПС на сцене игры (этап 8): метки здоровья и выбор щелчком.
export interface SceneCreaturesView {
  health: ReadonlyMap<number, CreatureHealth>;
  selectedId: number | null;
  // Есть — щелчок по монстру или НПС выбирает его (мастер в «Просмотре»).
  onPick?: (id: number) => void;
}

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
  // Откуда миниатюры объектов; без него — из справочников (редактор карты).
  images?: ObjectImagePaths;
  // Содержимое контейнеров смотрящему не отдают — подпись без него.
  hideContents?: boolean;
  creatures?: SceneCreaturesView;
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

// Объекты карты в сцене (docs/plan/done/map-objects.md, этапы 4 и 5). Наведение показывает
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
  images,
  hideContents,
  creatures,
}: ObjectLayerProps) {
  const all = useMemo(
    () => layoutObjects(state, refs, images, hideContents),
    [state, refs, images, hideContents],
  );
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
  const selectedId = tool ? tool.selectedId : (creatures?.selectedId ?? null);
  const selected = objects.find((object) => object.id === selectedId);
  // Щелчок по существу выбирает его, пока инструмент «Объекты» клик не забирает.
  const pick = !tool && creatures?.onPick;
  const healthOf = (id: number) => creatures?.health.get(id) ?? null;
  const tipHealth = tip && healthOf(tip.id);

  return (
    <>
      {objects.map((object) => {
        const { look } = object;
        return (
          // Смена признака «скрыт» пересоздаёт объект: материалы приходят чистыми.
          <GhostGroup
            key={`${object.id}:${object.hidden}`}
            active={object.hidden}
          >
            <group
              {...handlers(object.id)}
              {...(pick &&
                look.kind === 'creature' && {
                  onClick: (event: ThreeEvent<MouseEvent>) => {
                    event.stopPropagation();
                    pick(object.id);
                  },
                })}
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
                  health={healthOf(object.id)}
                />
              )}
              {look.kind === 'creature' && healthOf(object.id) && (
                <HealthMark
                  health={healthOf(object.id)!}
                  pc={false}
                  base={object.base}
                  top={object.top}
                  footprint={object.footprint}
                />
              )}
              {look.kind === 'start' && (
                <StartTile object={object} number={look.number} />
              )}
              {look.kind === 'container' && (
                <ContainerShape
                  look={look.look}
                  facing={look.facing}
                  base={object.base}
                />
              )}
              {look.kind === 'item' && (
                <FloorItem
                  object={object}
                  look={look}
                  texture={texture(look.image)}
                />
              )}
            </group>
          </GhostGroup>
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
          {tip.hidden && (
            <div className={classes.labelNote}>Скрыт от игроков</div>
          )}
          {tipHealth && (
            <div className={classes.labelNote}>
              {creatureHealthLabel(tipHealth, false)}
            </div>
          )}
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
