import { Html } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import {
  creatureHealthLabel,
  maskHas,
  type CreatureHealth,
  type FogMasks,
  type MapObjectRefsView,
} from 'shared';
import type { ObjectToolScene } from '../../editor/objects';
import type { MapViewState } from '../../mapStateFromChunks';
import FrameBox from '../FrameBox';
import type { HoverStore } from '../hoverStore';
import classes from '../MapScene.module.css';
import ContainerShape from './ContainerShape';
import CreatureBody from './CreatureBody';
import FloorItem from './FloorItem';
import FurnitureFigure from './FurnitureFigure';
import GhostGroup from './GhostGroup';
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
  // Есть — щелчок по сундуку, предмету на полу или обстановке открывает сведения о нём
  // (мастер в «Игре», docs/plan/scene-page.md, этап 6).
  onPickObject?: (id: number) => void;
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
  // Туман войны игрока: предметы, контейнеры и точки старта вне поля зрения — темнее.
  // Существ вне поля зрения сервер не присылает вовсе.
  fog?: FogMasks | null;
}

// Обводка выделенного объекта во всё его место и рост: у обстановки — прямоугольник
// её клеток.
function SelectionFrame({ object }: { object: SceneObject }) {
  const [hx, hz] =
    object.look.kind === 'furniture'
      ? [object.look.extent[0] / 2, object.look.extent[2] / 2]
      : [object.footprint / 2, object.footprint / 2];
  const [x, y, z] = object.base;
  return (
    <FrameBox
      min={[x - hx, y, z - hz]}
      max={[x + hx, object.top, z + hz]}
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
  fog = null,
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
  const pickObject = !tool && creatures?.onPickObject;
  const healthOf = (id: number) => creatures?.health.get(id) ?? null;
  const tipHealth = tip && healthOf(tip.id);

  return (
    <>
      {objects.map((object) => {
        const { look } = object;
        const dim =
          fog !== null &&
          look.kind !== 'creature' &&
          !maskHas(fog.visible, object.at);
        return (
          // Смена признака «скрыт» или серой зоны пересоздаёт объект: материалы
          // приходят чистыми.
          <GhostGroup
            key={`${object.id}:${object.hidden}:${dim}`}
            active={object.hidden}
            dim={dim}
          >
            <group
              {...handlers(object.id)}
              {...(pick &&
                look.kind === 'creature' &&
                // Выбранное существо щелчок не ловит: он проходит к клеткам под ним —
                // иначе большое существо закрывало собой соседние клетки хода
                // (2026-10-24). Снять выбор — Esc, щелчок мимо или строка списка.
                object.id !== selectedId && {
                  onClick: (event: ThreeEvent<MouseEvent>) => {
                    event.stopPropagation();
                    pick(object.id);
                  },
                })}
              {...(pickObject &&
                look.kind !== 'creature' &&
                look.kind !== 'start' && {
                  onClick: (event: ThreeEvent<MouseEvent>) => {
                    event.stopPropagation();
                    pickObject(object.id);
                  },
                })}
              onPointerOver={() => setHovered(object.id)}
              onPointerOut={() =>
                setHovered((prev) => (prev === object.id ? null : prev))
              }
            >
              {look.kind === 'creature' && (
                <CreatureBody
                  object={object}
                  look={look}
                  texture={texture(look.image)}
                  health={healthOf(object.id)}
                  mark
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
              {look.kind === 'furniture' && (
                <FurnitureFigure object={object} look={look} />
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
