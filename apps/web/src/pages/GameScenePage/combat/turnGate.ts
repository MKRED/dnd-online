import type { GameCombat } from 'shared';
import type { FigureDragHandlers } from '../../../features/maps/MapScene';

// Ходит ли сейчас фигурка игрока (docs/plan/combat.md, этап 3): без очерёдности — всегда;
// с ней — только в свой ход, а не позванная в бой стоит, как на сервере (этап 2).
export function figureTurnNow(
  combat: GameCombat | null,
  characterId: string,
): boolean {
  if (!combat || combat.combatants.length === 0) return true;
  const current = combat.combatants.find((c) => c.id === combat.turn);
  return (
    current?.ref.kind === 'figure' && current.ref.characterId === characterId
  );
}

// Не в свой ход фигурку игрока не тянут: сервер ход всё равно отклонит. Нажатие на неё только
// выбирает — посмотреть запас и карточку.
export function turnFigureDrag(
  drag: FigureDragHandlers | undefined,
  canAct: (characterId: string) => boolean,
): FigureDragHandlers | undefined {
  if (!drag?.onGrab) return drag;
  const { onGrab, onSelect } = drag;
  return {
    ...drag,
    onGrab: (id) => (canAct(id) ? onGrab(id) : onSelect?.(id)),
  };
}
