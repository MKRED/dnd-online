import { movementAllowance, type GameFigure } from 'shared';

type Movement = Pick<GameFigure, 'speed' | 'climb' | 'moved' | 'dashes'>;

// «20 из 30 фт», со скоростью лазания — «20 из 30 фт, лазание 50 из 60»: пройденное
// вычитается из обеих (docs/dnd/movement.md).
export function allowanceLabel(m: Movement): string {
  const left = movementAllowance(m);
  const total = (feet: number) => feet * (1 + m.dashes);
  const walk = `${left.walk} из ${total(m.speed)} фт`;
  return m.climb === null || left.climb === null
    ? walk
    : `${walk}, лазание ${left.climb} из ${total(m.climb)}`;
}
