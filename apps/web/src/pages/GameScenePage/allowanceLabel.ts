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

// Запас строкой: в бою — «осталось 20 из 30 фт», вне боя он не тратится — «до 30 фт за
// ход» (docs/dnd/movement.md, «Free and tactical modes»).
export function movementText(m: Movement, free: boolean): string {
  if (!free) return `осталось ${allowanceLabel(m)}`;
  const walk = `до ${m.speed} фт за ход`;
  return m.climb === null ? walk : `${walk}, лазание до ${m.climb}`;
}

// То же коротко для телефона: «5 / 40 фт» или «30 фт/ход».
export function shortMovementText(m: Movement, free: boolean): string {
  return free
    ? `${m.speed} фт/ход`
    : `${movementAllowance(m).walk} / ${m.speed * (1 + m.dashes)} фт`;
}
