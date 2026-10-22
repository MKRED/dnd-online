import {
  cellTypeId,
  insideMap,
  readCell,
  type MapOp,
  type SizedMapState,
  type Vec3,
} from 'shared';
import {
  cellOp,
  isRegionTool,
  regionBox,
  regionOp,
  toolCell,
  type EditorTool,
  type PickedCells,
  type SceneEditor,
  type ToolSettings,
} from './editorTools';
import {
  connectedEraseOps,
  eraseBoxOp,
  wallBox,
  type EraseMode,
} from './eraseModes';

export interface Anchor {
  cell: Vec3;
  // Для замены: имя блока в первом углу — его и будем заменять.
  match: string | null;
}

interface BlockSceneEditorOptions {
  tool: EditorTool;
  eraseMode: EraseMode;
  state: SizedMapState;
  settings: ToolSettings;
  anchor: Anchor | null;
  setAnchor: (anchor: Anchor | null) => void;
  setNotice: (notice: string | null) => void;
  applyOps: (ops: MapOp[]) => void;
}

// Ластик стены и области стирает между двумя углами — как заливка воздухом.
const erasesBetween = (tool: EditorTool, mode: EraseMode) =>
  tool === 'erase' && (mode === 'wall' || mode === 'region');

// Инструменты блоков на сцене: клик превращается в операцию карты, у инструментов
// с двумя углами первый клик запоминает угол.
export function blockSceneEditor({
  tool,
  eraseMode,
  state,
  settings,
  anchor,
  setAnchor,
  setNotice,
  applyOps,
}: BlockSceneEditorOptions): SceneEditor {
  const between = erasesBetween(tool, eraseMode);
  const { height } = settings;
  const region = between
    ? (a: Vec3, b: Vec3) =>
        eraseMode === 'wall' ? wallBox(a, b, height) : regionBox(a, b, height)
    : undefined;
  // Угол стирания можно взять и на земле: иначе стену не стереть до самого низа.
  const pickCell = between
    ? (cells: PickedCells) => cells.hit ?? cells.place
    : undefined;

  const onPick = (cells: PickedCells) => {
    const cell = pickCell ? pickCell(cells) : toolCell(tool, cells);
    // За границей карты сервер правку отклонит — и не отправляем.
    if (!cell || !insideMap(cell, state.size)) return;
    setNotice(null);
    if (tool === 'erase' && eraseMode === 'connected') {
      const ops = connectedEraseOps(state, cell);
      if (typeof ops === 'string') setNotice(ops);
      else applyOps(ops);
      return;
    }
    if (region) {
      if (!anchor) setAnchor({ cell, match: null });
      else {
        applyOps([eraseBoxOp(region(anchor.cell, cell))]);
        setAnchor(null);
      }
      return;
    }
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

  return {
    tool,
    anchor: anchor?.cell ?? null,
    height,
    onPick,
    pickCell,
    region,
  };
}
