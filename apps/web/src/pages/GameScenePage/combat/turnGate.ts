import type { CombatantRef, GameCombat } from 'shared';
import type { FigureDragHandlers } from '../../../features/maps/MapScene';

// Ходит ли сейчас участник (docs/plan/combat.md, этап 3): без очерёдности — всегда; с ней —
// только в свой ход, а не позванный в бой стоит, как на сервере (этап 2). Мастера в «Игре»
// это держит так же: вне хода переставляют в «Правке» (замечание Михаила 2026-10-28).
export function combatantTurnNow(
  combat: GameCombat | null,
  ref: CombatantRef,
): boolean {
  if (!combat || combat.combatants.length === 0) return true;
  const current = combat.combatants.find((c) => c.id === combat.turn)?.ref;
  if (!current) return false;
  return ref.kind === 'figure'
    ? current.kind === 'figure' && current.characterId === ref.characterId
    : current.kind === 'creature' && current.objectId === ref.objectId;
}

export const figureTurnNow = (
  combat: GameCombat | null,
  characterId: string,
): boolean => combatantTurnNow(combat, { kind: 'figure', characterId });

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
