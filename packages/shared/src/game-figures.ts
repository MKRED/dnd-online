import type { CharacterMainImage } from './characterImages.js';
import type { GameEventCharacter } from './game-events.js';
import type { CreatureHealth } from './hitPoints.js';
import type { Vec3 } from './map/coords.js';
import type { Facing } from './map/objects/mapObject.js';
import type { CreatureSize } from './map/rules/creature.js';

// Фигурки персонажей на активной сцене (docs/plan/done/game.md, этап 7). Фигурка есть только
// на активной сцене: когда сцена становится активной, фигурки встают на её стартовые
// точки заново.

// Размера у персонажа нет (docs/dnd/species.md): Маленький и Средний занимают одну
// клетку, поэтому фигурка пока всегда Средняя.
export const FIGURE_SIZE: CreatureSize = 'medium';

export interface GameFigure {
  character: GameEventCharacter;
  // Владелец персонажа.
  ownerId: string;
  at: Vec3;
  facing: Facing;
  size: CreatureSize;
  // Миниатюра основной картинки персонажа; null — картинки нет.
  image: CharacterMainImage | null;
  // Скорость из листа с эффектами, в футах.
  speed: number;
  // Сколько футов пройдено с начала раунда и сколько раз взят «Рывок».
  moved: number;
  dashes: number;
  // Смотрящий может водить эту фигурку — и править хиты, ячейки и эффекты персонажа.
  canMove: boolean;
  // Что видно о здоровье всем: «Ранен», «Без сознания», «Погиб» (hitPoints.ts).
  health: CreatureHealth | null;
}

export interface GameFigures {
  sceneId: string;
  // Номер журнала на момент чтения: ответ старше уже применённого не откатывает фигурки.
  eventSeq: number;
  figures: GameFigure[];
  // Персонажи на местах без фигурки на сцене — не хватило стартовой точки. Только мастеру.
  unplaced: GameEventCharacter[];
}

// Запас движения: Скорость и ещё одна за каждый «Рывок», минус пройденное.
export function movementLeft(
  figure: Pick<GameFigure, 'speed' | 'moved' | 'dashes'>,
): number {
  return Math.max(0, figure.speed * (1 + figure.dashes) - figure.moved);
}

// Фигурка встала на сцену: при активации сцены, когда персонаж сел на место, или её
// поставил мастер.
export interface GameFigurePlacement {
  character: GameEventCharacter;
  at: Vec3;
}
