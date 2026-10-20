import { useHotkeys } from '@mantine/hooks';
import { useMemo, useState } from 'react';
import {
  cellTypeId,
  insideMap,
  readCell,
  ROTATIONS,
  type MapOp,
  type SizedMapState,
  type Rotation,
  type Vec3,
} from 'shared';
import { useKeyCodes } from '../useKeyCodes';
import {
  cellOp,
  EDITOR_TOOLS,
  isRegionTool,
  regionOp,
  toolCell,
  type EditorTool,
  type PickedCells,
  type SceneEditor,
} from './editorTools';
import type { WalkTest } from '../walkTest';
import type { ObjectTool } from './objects';

interface Anchor {
  cell: Vec3;
  // Для замены: имя блока в первом углу — его и будем заменять.
  match: string | null;
}

interface MapEditorOptions {
  state: SizedMapState | null;
  applyOps: (ops: MapOp[]) => void;
  undo: () => void;
  redo: () => void;
  // Проверка хода: клики инструмента «Ход» уходят ей, а не в операции карты. Нет — нет
  // и инструмента (страница сцены игры).
  walk?: Pick<WalkTest, 'pick' | 'preview'>;
  // Инструмент «Объекты»: клики по клеткам и клавиши R, Del, Esc при нём уходят ему.
  objects: Pick<ObjectTool, 'pick' | 'span' | 'rotate' | 'remove' | 'escape'>;
  // false — инструменты спрятаны (открыта панель размера): клавиши 1–8, R и Del молчат.
  keysActive: boolean;
  // Инструменты на полосе, по порядку; без него — все (EDITOR_TOOLS).
  tools?: readonly EditorTool[];
}

// Клавиши 1–8 (и на цифровом блоке) — инструменты в порядке полосы.
const toolKeys = (
  tools: readonly EditorTool[],
  setTool: (tool: EditorTool) => void,
) =>
  Object.fromEntries(
    tools.flatMap((tool, index) => [
      [`Digit${index + 1}`, () => setTool(tool)],
      [`Numpad${index + 1}`, () => setTool(tool)],
    ]),
  );

// Состояние инструментов редактора мастера и превращение кликов по сцене в операции.
export function useMapEditor({
  state,
  applyOps,
  undo,
  redo,
  walk,
  objects,
  keysActive,
  tools = EDITOR_TOOLS,
}: MapEditorOptions) {
  const [tool, setToolState] = useState<EditorTool>('view');
  const [block, setBlock] = useState('stone');
  const [rotation, setRotation] = useState<Rotation>(0);
  const [height, setHeight] = useState(1);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  // Смена инструмента бросает начатую область: её первый угол относился к другому инструменту.
  const setTool = (next: EditorTool) => {
    setToolState(next);
    setAnchor(null);
  };

  // mod — Ctrl, на macOS Cmd. В полях ввода хоткеи не срабатывают (по умолчанию в Mantine).
  useHotkeys([
    ['mod+Z', undo],
    ['mod+shift+Z', redo],
    ['mod+Y', redo],
    [
      'Escape',
      () => {
        setAnchor(null);
        if (tool === 'objects') objects.escape();
      },
    ],
  ]);
  // Цифры и R — по месту клавиши (useKeyCodes): R в русской раскладке — это К.
  // У «Объектов» R поворачивает взгляд, у блоков — сам блок.
  useKeyCodes(
    {
      ...toolKeys(tools, setTool),
      KeyR: () =>
        tool === 'objects'
          ? objects.rotate()
          : setRotation(
              (r) => ROTATIONS[(ROTATIONS.indexOf(r) + 1) % ROTATIONS.length],
            ),
      Delete: () => {
        if (tool === 'objects') objects.remove();
      },
    },
    keysActive,
  );

  const walkPick = walk?.pick;
  const walkPreview = walk?.preview;
  const { pick: objectPick, span: objectSpan } = objects;
  const sceneEditor = useMemo<SceneEditor | null>(() => {
    if (tool === 'view' || !state) return null;
    if (tool === 'objects') {
      return {
        tool,
        anchor: null,
        height,
        onPick: objectPick,
        span: objectSpan,
      };
    }
    if (tool === 'walk') {
      if (!walkPick || !walkPreview) return null;
      return {
        tool,
        anchor: null,
        height,
        onPick: walkPick,
        preview: walkPreview,
      };
    }
    const settings = { block, rotation, height };
    const onPick = (cells: PickedCells) => {
      const cell = toolCell(tool, cells);
      // За границей карты сервер правку отклонит — и не отправляем.
      if (!cell || !insideMap(cell, state.size)) return;
      if (tool === 'place' || tool === 'erase') {
        applyOps([cellOp(tool, cell, settings)]);
        return;
      }
      if (!isRegionTool(tool)) return;
      if (!anchor) {
        const match =
          tool === 'replace'
            ? (state.palette[cellTypeId(readCell(state.store, cell))] ?? null)
            : null;
        setAnchor({ cell, match });
        return;
      }
      applyOps([regionOp(tool, anchor.cell, cell, settings, anchor.match)]);
      setAnchor(null);
    };
    return { tool, anchor: anchor?.cell ?? null, height, onPick };
  }, [
    tool,
    state,
    block,
    rotation,
    height,
    anchor,
    applyOps,
    walkPick,
    walkPreview,
    objectPick,
    objectSpan,
  ]);

  return {
    tool,
    setTool,
    block,
    setBlock,
    rotation,
    setRotation,
    height,
    setHeight,
    // Начатая область: первый угол выбран, ждём второй.
    anchor,
    cancelRegion: () => setAnchor(null),
    sceneEditor,
  };
}

export type MapEditor = ReturnType<typeof useMapEditor>;
