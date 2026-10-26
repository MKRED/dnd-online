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
  BUILD_MODES,
  buildsBlocks,
  EDITOR_TOOLS,
  isBuildMode,
  type EditorTool,
  type SceneEditor,
} from './editorTools';
import {
  readRecentPlace,
  saveRecentPlace,
  withRecentPlace,
  type ObjectChoice,
  type RecentPlace,
} from './PlacePicker/placeChoice';
import { nextEraseMode, type EraseMode } from './eraseModes';
import { blockSceneEditor, type Anchor } from './blockSceneEditor';
import type { WalkTest } from '../walkTest';
import type { ObjectTool } from './objects';
import { recentInScope } from './objects/objectScope';

type ToolObjects = Pick<
  ObjectTool,
  | 'pick'
  | 'extent'
  | 'ghost'
  | 'rotate'
  | 'remove'
  | 'escape'
  | 'choose'
  | 'settings'
  | 'selected'
  | 'scope'
  | 'moving'
>;

interface MapEditorOptions {
  state: SizedMapState | null;
  applyOps: (ops: MapOp[]) => void;
  undo: () => void;
  redo: () => void;
  // Проверка хода: клики инструмента «Ход» уходят ей, а не в операции карты. Нет — нет
  // и инструмента (страница сцены игры).
  walk?: Pick<WalkTest, 'pick' | 'preview'>;
  // Объекты инструмента «Поставить»: клики по клеткам, когда ставится объект, и клавиши
  // R, Del, Esc при выделенном объекте уходят ему.
  objects: ToolObjects;
  // Монстры и НПС инструмента «Существа» (сцена игры): клики по клеткам и клавиши R, Del,
  // Esc при нём уходят им. Нет — нет и инструмента.
  creatures?: ToolObjects;
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
  creatures,
  keysActive,
  tools = EDITOR_TOOLS,
}: MapEditorOptions) {
  const [tool, setToolState] = useState<EditorTool>('view');
  const [block, setBlock] = useState('stone');
  const [rotation, setRotation] = useState<Rotation>(0);
  const [heightState, setHeight] = useState(1);
  // «Область» и «Коробка» строят от угла до угла, без своей высоты (2026-10-24): у них
  // слой один, а заданная для «Замены» или ластика высота их не трогает.
  const height = tool === 'fill' || tool === 'hollow' ? 1 : heightState;
  // Недавнее (блоки и объекты вперемешку) и открытое окно «Что поставить» (этап 10).
  const [recentPlace, setRecentPlace] = useState(readRecentPlace);
  const [pickerOpen, setPickerOpen] = useState(false);
  // «Поставить» без выбранного: мастер снял объект или блок (✕ или Esc), щелчок по карте
  // ничего не ставит, рамки под курсором нет — пока не выбрано новое (2026-10-24, вариант В
  // артборда «Н2», docs/plan/done/scene-page.md).
  const [placeEmpty, setPlaceEmpty] = useState(false);
  const clearPlace = () => {
    objects.choose(null);
    setPlaceEmpty(true);
  };
  const remember = (recent: RecentPlace) => {
    const next = withRecentPlace(recentPlace, recent);
    setRecentPlace(next);
    saveRecentPlace(next);
  };
  // Блок из окна: у «Поставить» он сменяет объект; у заливки, коробки и замены объект
  // «Поставить» остаётся каким был.
  const applyBlock = (name: string) => {
    setBlock(name);
    if (tool === 'place') {
      objects.choose(null);
      setPlaceEmpty(false);
    }
  };
  const applyObject = (choice: ObjectChoice) => {
    objects.choose(choice);
    setPlaceEmpty(false);
  };
  const applyRecent = (recent: RecentPlace) =>
    recent.type === 'block'
      ? applyBlock(recent.name)
      : applyObject(recent.choice);
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
  const keyTool = (next: EditorTool) => {
    if (next === 'erase' && tool === 'erase')
      setEraseMode(nextEraseMode(eraseMode));
    // Клавиша «Строить» при нём же — следующий режим: по одному → область → коробка.
    else if (next === 'place' && isBuildMode(tool))
      setTool(
        BUILD_MODES[(BUILD_MODES.indexOf(tool) + 1) % BUILD_MODES.length],
      );
    else setTool(next);
  };

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
        // У «Существ» Esc снимает выбранное существо или ставящееся.
        if (tool === 'creatures' && creatures) {
          if (creatures.selected !== null) creatures.escape();
          else creatures.choose(null);
          return;
        }
        // Сначала бросается перенос и выделение поставленного, следующий Esc снимает
        // то, что ставится.
        if (tool !== 'place') return;
        if (objects.selected !== null) objects.escape();
        else clearPlace();
      },
    ],
  ]);
  // Цифры и R — по месту клавиши (useKeyCodes): R в русской раскладке — это К.
  // У «Поставить» R поворачивает выделенный или ставящийся объект, у блоков — сам блок.
  const objectFirst =
    tool === 'place' &&
    (objects.selected !== null || objects.settings.choice !== null);
  useKeyCodes(
    {
      ...toolKeys(tools, keyTool),
      KeyR: () =>
        tool === 'creatures'
          ? creatures?.rotate()
          : objectFirst
            ? objects.rotate()
            : setRotation(
                (r) => ROTATIONS[(ROTATIONS.indexOf(r) + 1) % ROTATIONS.length],
              ),
      Delete: () => {
        if (tool === 'place') objects.remove();
        if (tool === 'creatures') creatures?.remove();
      },
      KeyB: () => {
        if (buildsBlocks(tool) || tool === 'creatures') setPickerOpen(true);
      },
    },
    // Пока открыто окно «Что поставить», цифры не должны менять инструмент за ним.
    keysActive && !pickerOpen,
  );

  const walkPick = walk?.pick;
  const walkPreview = walk?.preview;
  const {
    pick: objectPick,
    extent: objectExtent,
    ghost: objectGhost,
    escape: objectEscape,
    moving: objectMoving,
  } = objects;
  const placesObject = objects.settings.choice !== null;
  const placesNothing = tool === 'place' && placeEmpty && !placesObject;
  const hasSelection = objects.selected !== null;
  const movingObject = objectMoving && hasSelection;
  const creaturePick = creatures?.pick;
  const creatureExtent = creatures?.extent;
  const creatureGhost = creatures?.ghost;
  // Щелчок по клетке «Существ» что-то делает, только когда существо ставят или выбрано.
  const creaturesIdle =
    !creatures ||
    (creatures.settings.choice === null && creatures.selected === null);
  const sceneEditor = useMemo<SceneEditor | null>(() => {
    if (tool === 'view' || !state) return null;
    if (tool === 'creatures') {
      if (!creaturePick) return null;
      return {
        tool,
        anchor: null,
        height,
        onPick: creaturePick,
        extent: creatureExtent,
        ghost: creatureGhost,
        idle: creaturesIdle,
      };
    }
    // «Перенести»: щелчок по клетке переносит выделенный объект, что бы ни было выбрано
    // ставить. Раньше без выбранного объекта щелчок уходил блокам и только снимал
    // «Перенести» (замечания после первой партии, 2026-10-26).
    if (tool === 'place' && movingObject) {
      return {
        tool,
        anchor: null,
        height,
        onPick: objectPick,
        extent: objectExtent,
      };
    }
    // Пустое «Поставить»: щелчок мимо только снимает выделение, как у объектов.
    if (placesNothing) {
      return {
        tool,
        anchor: null,
        height,
        onPick: () => objectEscape(),
        idle: true,
      };
    }
    if (tool === 'place' && placesObject) {
      return {
        tool,
        anchor: null,
        height,
        onPick: objectPick,
        extent: objectExtent,
        ghost: objectGhost,
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
    const blocks = blockSceneEditor({
      tool,
      eraseMode,
      state,
      settings: { block, rotation, height },
      anchor,
      setAnchor,
      setNotice,
      applyOps,
    });
    // Клик мимо при выделенном объекте только снимает выделение, как у объектов: иначе
    // после правки свойств следующий клик поставил бы лишний блок.
    return tool === 'place' && hasSelection && blocks
      ? { ...blocks, onPick: () => objectEscape() }
      : blocks;
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
    objectExtent,
    objectGhost,
    objectEscape,
    placesObject,
    placesNothing,
    hasSelection,
    movingObject,
    creaturePick,
    creatureExtent,
    creatureGhost,
    creaturesIdle,
  ]);

  return {
    // Каталог блоков карты для окна выбора и подписей панели (docs/plan/blocks.md, этап 6а).
    catalog: state?.blocks ?? BASE_BLOCKS,
    tool,
    setTool,
    block,
    setBlock,
    // Выбор в окне «Что поставить»: становится первым в недавних.
    pickBlock: (name: string) => {
      applyBlock(name);
      remember({ type: 'block', name });
    },
    pickObject: (choice: ObjectChoice) => {
      applyObject(choice);
      remember({ type: 'object', choice });
    },
    // Существо из недавних в панели «Существ».
    selectCreatureRecent: (recent: RecentPlace) => {
      if (recent.type === 'object') creatures?.choose(recent.choice);
    },
    // Существо из окна «Какое существо поставить».
    pickCreature: (choice: ObjectChoice) => {
      creatures?.choose(choice);
      remember({ type: 'object', choice });
    },
    // «Поставить» без выбранного (✕ на карточке «Ставить» или Esc).
    placeEmpty: placesNothing,
    clearPlace,
    // Из недавних в панели — порядок не меняется.
    selectRecent: applyRecent,
    // Недавние «Строить» — без существ, если их ставит «Существа»; недавние «Существ».
    recentPlace: recentPlace.filter((r) => recentInScope(objects.scope, r)),
    creatureRecent: recentPlace.filter((r) => recentInScope('creatures', r)),
    // «Существа» ставят новое существо: подсказки говорят «поставить».
    placesCreature: (creatures?.settings.choice ?? null) !== null,
    tools,
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
