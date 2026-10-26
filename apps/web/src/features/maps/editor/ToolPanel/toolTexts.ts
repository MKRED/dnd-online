import type { EditorTool } from '../editorTools';
import type { EraseMode } from '../eraseModes';
import { blocksText, sizeText, type RegionPreview } from '../regionPreview';

// Строка под названием инструмента в шапке свойств (docs/plan/done/scene-page.md, этап 3).
export const TOOL_SUMMARIES: Record<EditorTool, string> = {
  view: 'Смотреть и выбирать, карту не меняет',
  creatures: 'Ставить и двигать героев, НПС и монстров',
  place: 'Повторная клавиша — следующий режим',
  erase: 'Повторная клавиша — следующий режим',
  fill: 'Два угла — сплошной блок',
  hollow: 'Стены, пол и потолок, внутри воздух',
  replace: 'В области меняет один блок на другой',
  walk: 'Проверка хода фигуркой, карту не меняет',
};

// Пояснение режима ластика в его строке.
export const ERASE_MODE_SUMMARIES: Record<EraseMode, string> = {
  block: 'Щелчок удаляет один блок',
  plane: 'Два угла стены или пола, толщина в клетку',
  region: 'Два угла: стирается всё внутри',
  connected: 'Вся постройка из того же материала',
};

// Пустое «Поставить» (мастер снял выбранное): щелчок по карте ничего не ставит.
export const EMPTY_PLACE_HINT = 'Ничего не выбрано — щелчок ничего не ставит';

// Что делает щелчок, пока угол не выбран, — коротко, для плашки на сцене. touch — те же
// слова для телефона: касание вместо щелчка (docs/plan/done/scene-page.md, «Телефон»).
export function firstClickHint(
  tool: EditorTool,
  eraseMode: EraseMode,
  placesObject: boolean,
  touch = false,
): string {
  const hint = mouseHint(tool, eraseMode, placesObject);
  return touch
    ? hint
        .replace('Двойной клик', 'Двойное касание')
        .replace('Щелчок', 'Касание')
    : hint;
}

function mouseHint(
  tool: EditorTool,
  eraseMode: EraseMode,
  placesObject: boolean,
): string {
  switch (tool) {
    case 'view':
      return 'Двойной клик — центр вращения сюда';
    case 'creatures':
      return placesObject
        ? 'Щелчок по клетке — поставить существо'
        : 'Щелчок по существу — выбрать, по клетке — переставить';
    case 'place':
      return placesObject
        ? 'Щелчок по клетке — поставить объект'
        : 'Щелчок по грани — блок рядом с ней';
    case 'erase':
      return eraseMode === 'block'
        ? 'Щелчок по блоку — стереть'
        : eraseMode === 'connected'
          ? 'Щелчок — стереть всю постройку из этого материала'
          : 'Щелчок — первый угол';
    case 'fill':
    case 'hollow':
    case 'replace':
      return 'Щелчок — первый угол';
    case 'walk':
      return 'Щелчок — поставить фигурку или сделать ход';
  }
}

// Что будет вторым щелчком — словами, по инструменту.
export function previewText(tool: EditorTool, preview: RegionPreview): string {
  const size = sizeText(preview.size);
  if (preview.blocks === null) return `${size} — слишком много, чтобы считать`;
  const blocks = blocksText(preview.blocks);
  switch (tool) {
    case 'hollow':
      return preview.inner
        ? `${size}, внутри ${sizeText(preview.inner)} — ${blocks}`
        : `${size} — ${blocks}, пустоты нет`;
    case 'replace':
      return `заменится ${blocks}`;
    case 'erase':
      return `${size}: сотрётся ${blocks}`;
    default:
      return `${size} — ${blocks}`;
  }
}
