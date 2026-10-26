import { useCallback, useMemo, useState } from 'react';
import {
  nextFacing,
  objectRefsFromView,
  objectBox,
  objectFacing,
  type Facing,
  type MapObject,
  type MapObjectRefsView,
  type MapOp,
  type ObjectFields,
  type Vec3,
} from 'shared';
import type { PickedCells } from '../editorTools';
import type { MapViewState } from '../../mapStateFromChunks';
import {
  moveOp,
  objectCell,
  onTopCell,
  rulesMap,
  placeBody,
  placeExtent,
  rightFacing,
  type ObjectChoice,
} from './objectPlacement';
import { useShiftKey } from './useShiftKey';
import { choiceLook } from './choiceLook';

interface ObjectToolOptions {
  state: MapViewState | null;
  refs: MapObjectRefsView | null;
  applyOps: (ops: MapOp[]) => void;
}

// Что сцене нужно от инструмента: выделение и перетаскивание объектов.
export interface ObjectToolScene {
  selectedId: number | null;
  select: (id: number) => void;
  // Нажали мышью на объект: перетаскивание до отпускания.
  grab: (id: number) => void;
  // Отпустили: cell — клетка под курсором (null — курсор ушёл со сцены).
  drop: (cell: Vec3 | null) => void;
}

// Объекты в инструменте «Поставить» (docs/plan/done/map-objects.md, «Редактор: один
// инструмент»; с этапа 10 docs/plan/blocks.md — вместе с блоками).
// Клик по пустой клетке ставит выбранное, а при выделенном объекте — только снимает
// выделение: иначе после правки свойств следующий клик мимо поставил бы лишний
// объект. Поставленный объект не выделяется — так ставят несколько подряд.
export function useObjectTool({ state, refs, applyOps }: ObjectToolOptions) {
  // null — инструмент «Поставить» ставит блок (этап 10).
  const [choice, setChoice] = useState<ObjectChoice | null>(null);
  const [facing, setFacing] = useState<Facing>(0);
  const [hidden, setHidden] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // «Перенести» в свойствах: следующий клик по клетке переносит выделенный объект.
  const [moving, setMoving] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  // Shift зажат — обстановка ставится, переносится и поворачивается без проверок места
  // (этап 8в; Alt+клик уже переносит центр камеры).
  const shift = useShiftKey();

  // Выделенный объект ищем в карте на каждой отрисовке: отмена постановки или чужое
  // удаление снимает выделение само.
  const selected =
    (selectedId !== null && state?.objects.byId.get(selectedId)) || null;
  const objectRefs = useMemo(
    () => (refs ? objectRefsFromView(refs) : null),
    [refs],
  );
  // Место объекта [ширина, высота, глубина]: у обстановки — по модели с поворотом.
  const extentOf = useCallback(
    (object: MapObject): Vec3 => {
      if (!objectRefs) return [1, 1, 1];
      const { min, max } = objectBox(object, objectRefs);
      return [max[0] - min[0] + 1, max[1] - min[1] + 1, max[2] - min[2] + 1];
    },
    [objectRefs],
  );

  const settings = { choice, facing, hidden };
  const dragged =
    (draggingId !== null && state?.objects.byId.get(draggingId)) || null;
  const carried = dragged ?? (moving ? selected : null);
  const [ex, ey, ez] = carried ? extentOf(carried) : placeExtent(settings);
  // Один и тот же массив, пока место не изменилось: по нему пересобирается редактор сцены.
  const extent = useMemo<Vec3>(() => [ex, ey, ez], [ex, ey, ez]);

  // Полупрозрачное ставящееся под курсором; при выделенном или переносимом объекте щелчок
  // ставить не будет — и призрака нет.
  const ghost = useMemo(
    () =>
      choice && !selected && !carried ? choiceLook(choice, facing) : undefined,
    [choice, facing, selected, carried],
  );

  const edit = (op: MapOp) => applyOps([op]);
  const move = (object: MapObject, cell: Vec3) => {
    if (!state) return;
    const force = shift.current && object.kind === 'furniture';
    const at = onTopCell(rulesMap(state, objectRefs), object.kind, cell);
    const op = moveOp(object, at, extentOf(object), state.size, force);
    if (op) edit(op);
  };

  const pick = (cells: PickedCells) => {
    if (!state) return;
    if (moving && selected) {
      move(selected, cells.place);
      setMoving(false);
      return;
    }
    if (selected) {
      setSelectedId(null);
      return;
    }
    const body = placeBody(settings);
    const place = body
      ? onTopCell(rulesMap(state, objectRefs), body.kind, cells.place)
      : cells.place;
    const at = objectCell(place, extent, state.size);
    const force = shift.current && body?.kind === 'furniture';
    if (body && at)
      edit({ op: 'placeObject', at, object: body, ...(force && { force }) });
  };

  const select = useCallback((id: number) => {
    setSelectedId(id);
    setMoving(false);
  }, []);

  const scene: ObjectToolScene = {
    selectedId: selected?.id ?? null,
    select,
    grab: (id) => {
      select(id);
      setDraggingId(id);
    },
    drop: (cell) => {
      setDraggingId(null);
      if (dragged && cell) move(dragged, cell);
    },
  };

  return {
    settings,
    // Что ставить: объект или null — блок (выбор в окне «Что поставить»).
    choose: setChoice,
    setFacing,
    setHidden,
    selected,
    select,
    moving,
    setMoving,
    extent,
    ghost,
    pick,
    scene,
    extentOf,
    // R: взгляд выделенного объекта, а без выделения — следующего ставящегося.
    // Обстановка поворачивается на 90° (этап 8в).
    rotate: () => {
      if (!selected) {
        setFacing((current) =>
          choice?.kind === 'furniture'
            ? nextRight(rightFacing(current))
            : nextFacing(current),
        );
        return;
      }
      const facing = objectFacing(selected);
      if (facing === null) return;
      edit(
        turnOp(
          selected,
          selected.kind === 'furniture'
            ? nextRight(facing)
            : nextFacing(facing),
          shift.current,
        ),
      );
    },
    turn: (to: Facing) => {
      if (selected) edit(turnOp(selected, to, shift.current));
    },
    update: (fields: ObjectFields) => {
      if (selected)
        edit({ op: 'updateObject', id: selected.id, object: fields });
    },
    // Положение двери (этап 8г); с Shift — без проверки места, как постановка.
    setPosition: (position: number) => {
      if (!selected) return;
      const force = shift.current;
      edit({
        op: 'setPosition',
        id: selected.id,
        position,
        ...(force && { force }),
      });
    },
    remove: () => {
      if (!selected) return;
      edit({ op: 'removeObject', id: selected.id });
      setSelectedId(null);
    },
    // Esc: сначала бросает «Перенести», потом снимает выделение.
    escape: () => {
      if (moving) setMoving(false);
      else setSelectedId(null);
    },
  };
}

export type ObjectTool = ReturnType<typeof useObjectTool>;

// Следующее направление обстановки по часовой: через 90°.
const nextRight = (facing: Facing): Facing => ((facing + 90) % 360) as Facing;

// Поворот; обстановку с Shift — без проверок места.
function turnOp(object: MapObject, facing: Facing, shift: boolean): MapOp {
  const force = shift && object.kind === 'furniture';
  return { op: 'turnObject', id: object.id, facing, ...(force && { force }) };
}
