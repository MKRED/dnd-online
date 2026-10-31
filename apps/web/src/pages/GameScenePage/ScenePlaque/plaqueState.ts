import type { GameCreature, GameEventCharacter } from 'shared';
import type { GameFigure } from 'shared';
import { movementText, shortMovementText } from '../allowanceLabel';
import type { PlaqueState } from './ScenePlaque';

interface PlaqueInput {
  // Персонаж «Не на сцене», которого мастер ставит в «Правке».
  placing: GameEventCharacter | null;
  figure: GameFigure | null;
  // Мастер в «Правке»: фигурка встаёт без пути и запаса.
  free: boolean;
  creature: GameCreature | null;
  // Выбранное существо сейчас можно водить (у мастера в «Игре»).
  creatureMoving: boolean;
  // Свободный режим хода: запас не тратится (docs/dnd/movement.md).
  freeMove?: boolean;
  // Бой с очерёдностью, а у выбранного не его ход: клетки хода не подсвечены.
  outOfTurn?: boolean;
  master?: boolean;
  // Мастер запретил игроку ходить выбранной фигуркой (GameFigure.moveLocked).
  locked?: boolean;
}

// Что сказать на плашке сцены о выбранном (docs/plan/done/scene-page.md, этап 2) — бывшие
// подсказки панели «Фигурки» и «Существа» одной строкой.
export function plaqueState({
  placing,
  figure,
  free,
  creature,
  creatureMoving,
  freeMove = false,
  outOfTurn = false,
  master = false,
  locked = false,
}: PlaqueInput): PlaqueState | null {
  // Вне хода: запас виден, а ходить нельзя (замечание Михаила 2026-10-28).
  const moveHint = locked
    ? 'мастер запретил ходить'
    : !outOfTurn
      ? 'щелчок по подсвеченной клетке — ход'
      : master
        ? 'сейчас не его ход; переставить можно в «Правке»'
        : 'ходит в свой ход';
  if (placing) {
    return {
      name: placing.name,
      left: null,
      hint: 'щёлкните клетку, куда поставить',
    };
  }
  if (figure) {
    return free
      ? {
          name: figure.character.name,
          left: null,
          hint: 'щелчок по клетке — встанет туда без пути и запаса',
        }
      : {
          name: figure.character.name,
          left: movementText(figure, freeMove),
          short: shortMovementText(figure, freeMove),
          hint: moveHint,
        };
  }
  const state = creature?.state;
  if (!creature || !state) return null;
  if (creature.health === 'down' || creature.health === 'dead') {
    return { name: state.name, left: null, hint: 'повержен и не ходит' };
  }
  return creatureMoving
    ? {
        name: state.name,
        left: movementText(state.movement, freeMove),
        short: shortMovementText(state.movement, freeMove),
        hint: moveHint,
      }
    : {
        name: state.name,
        left: null,
        hint: 'ходит в режиме «Игра»; в «Правке» его переносят инструментом «Существа»',
      };
}
