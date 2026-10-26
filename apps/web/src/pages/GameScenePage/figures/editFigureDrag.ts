import type { EditorTool } from '../../../features/maps/editor';
import type { FigureDragHandlers } from '../../../features/maps/MapScene';

interface EditFigureDragOptions {
  // Обработчики фигурок страницы; нет — фигурки сейчас не выбираются.
  drag: FigureDragHandlers | undefined;
  editing: boolean;
  tool: EditorTool;
  // Выбрали героя — монстр или ставящееся существо «Существ» снимаются.
  clearCreature: () => void;
  // Двойной щелчок в «Просмотре» — окно карточки персонажа.
  onOpen: (characterId: string) => void;
}

// Фигурки героев по режиму и инструменту (замечания после первой партии, 2026-10-26): в
// «Игре» и в «Существах» их тянут и выбирают, в «Просмотре» только выбирают, а двойной
// щелчок открывает окно. Остальные инструменты фигурки не трогают — их обработчиков нет.
export function editFigureDrag({
  drag,
  editing,
  tool,
  clearCreature,
  onOpen,
}: EditFigureDragOptions): FigureDragHandlers | undefined {
  if (!drag || !editing) return drag;
  if (tool === 'view') return { onSelect: drag.onSelect, onOpen };
  if (tool !== 'creatures') return undefined;
  return {
    ...drag,
    onGrab: (characterId) => {
      clearCreature();
      drag.onGrab?.(characterId);
    },
    onSelect: (characterId) => {
      clearCreature();
      drag.onSelect?.(characterId);
    },
  };
}
