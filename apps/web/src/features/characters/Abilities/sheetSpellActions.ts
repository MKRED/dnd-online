import type { SpellSlotsExpended } from 'shared';

// Правки заклинаний листа не через справочник, а через игру (замечания после первой
// партии, 2026-10-26, вариант А): ячейки и подготовка в окне карточки на сцене. Есть
// действие — кружок или отметка нажимается; нет — только чтение. Ответ правки обновляет
// лист сам (кто его показывает, тот и перечитывает).
export interface SheetSpellActions {
  spend?: (expended: SpellSlotsExpended) => Promise<void>;
  // id строки способности на листе.
  prepare?: (entryId: string, prepared: boolean) => Promise<void>;
}
