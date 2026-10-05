import { useHotkeys } from '@mantine/hooks';
import { useMemo, useState } from 'react';
import {
  cellTypeId,
  readCell,
  type MapOp,
  type MapState,
  type Rotation,
  type Vec3,
} from 'shared';
import {
  cellOp,
  isRegionTool,
  regionOp,
  toolCell,
  type EditorTool,
  type PickedCells,
  type SceneEditor,
} from './editorTools';

interface Anchor {
  cell: Vec3;
  // Для замены: имя блока в первом углу — его и будем заменять.
  match: string | null;
}

interface MapEditorOptions {
  state: MapState | null;
  applyOps: (ops: MapOp[]) => void;
  undo: () => void;
  redo: () => void;
}

// Состояние инструментов редактора мастера и превращение кликов по сцене в операции.
export function useMapEditor({
  state,
  applyOps,
  undo,
  redo,
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
    ['Escape', () => setAnchor(null)],
  ]);

  const sceneEditor = useMemo<SceneEditor | null>(() => {
    if (tool === 'view' || !state) return null;
    const settings = { block, rotation, height };
    const onPick = (cells: PickedCells) => {
      const cell = toolCell(tool, cells);
      if (!cell) return;
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
  }, [tool, state, block, rotation, height, anchor, applyOps]);

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
