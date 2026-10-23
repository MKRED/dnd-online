import { useHotkeys } from '@mantine/hooks';
import { useMemo, useState } from 'react';
import {
  BASE_BLOCKS,
  ROTATIONS,
  type MapOp,
  type SizedMapState,
  type Rotation,
} from 'shared';
import { useKeyCodes } from '../useKeyCodes';
import {
  buildsBlocks,
  EDITOR_TOOLS,
  type EditorTool,
  type SceneEditor,
} from './editorTools';
import { readRecentBlocks, saveRecentBlocks, withRecent } from './BlockPicker';
import { nextEraseMode, type EraseMode } from './eraseModes';
import { blockSceneEditor, type Anchor } from './blockSceneEditor';
import type { WalkTest } from '../walkTest';
import type { ObjectTool } from './objects';

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

// Клавиши 1–8 (и на цифровом блоке) — инструменты в порядке полосы; клавиша уже
// выбранного инструмента переключает его режим (у ластика).
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
  // Недавние блоки и открытое окно выбора блока (BlockPicker).
  const [recentBlocks, setRecentBlocks] = useState(readRecentBlocks);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickBlock = (name: string) => {
    setBlock(name);
    const next = withRecent(recentBlocks, name);
    setRecentBlocks(next);
    saveRecentBlocks(next);
  };
  const [eraseMode, setEraseModeState] = useState<EraseMode>('block');
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  // Почему клик ничего не сделал (связное стирание слишком большой постройки).
  const [notice, setNotice] = useState<string | null>(null);

  // Смена инструмента или режима бросает начатую область: её первый угол относился
  // к другому инструменту.
  const setTool = (next: EditorTool) => {
    setToolState(next);
    setAnchor(null);
    setNotice(null);
    setPickerOpen(false);
  };
  const setEraseMode = (next: EraseMode) => {
    setEraseModeState(next);
    setAnchor(null);
    setNotice(null);
  };
  const keyTool = (next: EditorTool) =>
    next === 'erase' && tool === 'erase'
      ? setEraseMode(nextEraseMode(eraseMode))
      : setTool(next);

  // mod — Ctrl, на macOS Cmd. В полях ввода хоткеи не срабатывают (по умолчанию в Mantine).
  useHotkeys([
    ['mod+Z', undo],
    ['mod+shift+Z', redo],
    ['mod+Y', redo],
    [
      'Escape',
      () => {
        // Esc закрывает окно выбора блока, начатую область оставляем.
        if (pickerOpen) return;
        setAnchor(null);
        setNotice(null);
        if (tool === 'objects') objects.escape();
      },
    ],
  ]);
  // Цифры и R — по месту клавиши (useKeyCodes): R в русской раскладке — это К.
  // У «Объектов» R поворачивает взгляд, у блоков — сам блок.
  useKeyCodes(
    {
      ...toolKeys(tools, keyTool),
      KeyR: () =>
        tool === 'objects'
          ? objects.rotate()
          : setRotation(
              (r) => ROTATIONS[(ROTATIONS.indexOf(r) + 1) % ROTATIONS.length],
            ),
      Delete: () => {
        if (tool === 'objects') objects.remove();
      },
      KeyB: () => {
        if (buildsBlocks(tool)) setPickerOpen(true);
      },
    },
    // Пока открыто окно выбора блока, цифры не должны менять инструмент за ним.
    keysActive && !pickerOpen,
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
    return blockSceneEditor({
      tool,
      eraseMode,
      state,
      settings: { block, rotation, height },
      anchor,
      setAnchor,
      setNotice,
      applyOps,
    });
  }, [
    tool,
    state,
    block,
    rotation,
    height,
    eraseMode,
    anchor,
    applyOps,
    walkPick,
    walkPreview,
    objectPick,
    objectSpan,
  ]);

  return {
    // Каталог блоков карты для окна выбора и подписей панели (docs/plan/blocks.md, этап 6а).
    catalog: state?.blocks ?? BASE_BLOCKS,
    tool,
    setTool,
    block,
    setBlock,
    // Блок из окна выбора: становится первым в недавних.
    pickBlock,
    recentBlocks,
    pickerOpen,
    setPickerOpen,
    rotation,
    setRotation,
    height,
    setHeight,
    eraseMode,
    setEraseMode,
    notice,
    // Начатая область: первый угол выбран, ждём второй.
    anchor,
    cancelRegion: () => setAnchor(null),
    sceneEditor,
  };
}

export type MapEditor = ReturnType<typeof useMapEditor>;
