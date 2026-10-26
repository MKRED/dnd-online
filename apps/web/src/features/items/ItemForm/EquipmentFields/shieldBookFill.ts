import { BOOK_SHIELD } from 'shared';
import type { ItemFormValues } from '../itemFormValues';

type CommonFields = Pick<ItemFormValues, 'name' | 'weight' | 'costAmount'>;

// Что подставить при выборе категории «Щит»: вес, цену и название щита книги, как образец
// у оружия и доспеха. Только в пустые поля — введённое руками не трогаем.
export function shieldBookFill({
  name,
  weight,
  costAmount,
}: CommonFields): Partial<ItemFormValues> {
  const fill: Partial<ItemFormValues> = {};
  if (name.trim() === '') fill.name = 'Щит';
  if (weight === '' || Number(weight) === 0) fill.weight = BOOK_SHIELD.weight;
  if (costAmount === '') {
    fill.costAmount = BOOK_SHIELD.cost.amount;
    fill.costCoin = BOOK_SHIELD.cost.coin;
  }
  return fill;
}
