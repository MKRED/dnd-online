import { useCallback, useMemo, useState } from 'react';
import {
  nextFacing,
  objectRefsFromView,
  objectFacing,
  objectSpan,
  type ContainerLook,
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
  placeBody,
  placeSpan,
  type CatalogChoice,
  type PlaceKind,
} from './objectPlacement';

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

// Инструмент «Объекты» (docs/plan/done/map-objects.md, «Редактор: один инструмент»).
// Клик по пустой клетке ставит выбранное, а при выделенном объекте — только снимает
// выделение: иначе после правки свойств следующий клик мимо поставил бы лишний
// объект. Поставленный объект не выделяется — так ставят несколько подряд.
export function useObjectTool({ state, refs, applyOps }: ObjectToolOptions) {
  const [kind, setKind] = useState<PlaceKind>('start');
  const [creature, setCreature] = useState<CatalogChoice | null>(null);
  const [item, setItem] = useState<CatalogChoice | null>(null);
  const [look, setLook] = useState<ContainerLook>('chest');
  const [facing, setFacing] = useState<Facing>(0);
  const [hidden, setHidden] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // «Перенести» в свойствах: следующий клик по клетке переносит выделенный объект.
  const [moving, setMoving] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  // Клик по клетке, когда ставить нечего (существо или предмет не выбраны).
  const [missingChoice, setMissingChoice] = useState(false);

  // Выделенный объект ищем в карте на каждой отрисовке: отмена постановки или чужое
  // удаление снимает выделение само.
  const selected =
    (selectedId !== null && state?.objects.byId.get(selectedId)) || null;
  const objectRefs = useMemo(
    () => (refs ? objectRefsFromView(refs) : null),
    [refs],
  );
  const spanOf = useCallback(
    (object: MapObject) => (objectRefs ? objectSpan(object, objectRefs) : 1),
    [objectRefs],
  );

  const settings = { kind, creature, item, look, facing, hidden };
  const dragged =
    (draggingId !== null && state?.objects.byId.get(draggingId)) || null;
  const carried = dragged ?? (moving ? selected : null);
  const span = carried ? spanOf(carried) : placeSpan(settings);

  const edit = (op: MapOp) => applyOps([op]);
  const move = (object: MapObject, cell: Vec3) => {
    if (!state) return;
    const op = moveOp(object, cell, spanOf(object), state.size);
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
    setMissingChoice(body === null);
    const at = objectCell(cells.place, span, state.size);
    if (body && at) edit({ op: 'placeObject', at, object: body });
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
    setKind,
    setCreature: (choice: CatalogChoice | null) => {
      setCreature(choice);
      setMissingChoice(false);
    },
    setItem: (choice: CatalogChoice | null) => {
      setItem(choice);
      setMissingChoice(false);
    },
    setLook,
    setFacing,
    setHidden,
    missingChoice,
    selected,
    select,
    moving,
    setMoving,
    span,
    pick,
    scene,
    spanOf,
    // R: взгляд выделенного объекта, а без выделения — следующего ставящегося.
    rotate: () => {
      if (!selected) setFacing(nextFacing);
      else {
        const facing = objectFacing(selected);
        if (facing !== null) {
          edit({
            op: 'turnObject',
            id: selected.id,
            facing: nextFacing(facing),
          });
        }
      }
    },
    turn: (to: Facing) => {
      if (selected) edit({ op: 'turnObject', id: selected.id, facing: to });
    },
    update: (fields: ObjectFields) => {
      if (selected)
        edit({ op: 'updateObject', id: selected.id, object: fields });
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
