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
}: PlaqueInput): PlaqueState | null {
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
          hint: 'щелчок по подсвеченной клетке — ход',
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
        hint: 'щелчок по подсвеченной клетке — ход',
      }
    : {
        name: state.name,
        left: null,
        hint: 'ходит в режиме «Игра»; в «Правке» его переносят инструментом «Существа»',
      };
}
