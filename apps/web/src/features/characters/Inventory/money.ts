import type { CharacterCurrency } from 'shared';
import { COIN_LABELS } from '../../items/itemLabels';

// Монеты от дорогих к дешёвым: так кошелёк читается привычнее, чем в порядке формы.
// Сокращения — общие с ценой предмета (docs/dnd/items.md).
const COINS: (keyof CharacterCurrency)[] = ['pp', 'gp', 'ep', 'sp', 'cp'];

export function hasMoney(currency: CharacterCurrency): boolean {
  return COINS.some((coin) => currency[coin] > 0);
}

// «30 ЗМ · 2 СМ»; пустой кошелёк — пустая строка.
export function formatMoney(currency: CharacterCurrency): string {
  return COINS.filter((coin) => currency[coin] > 0)
    .map((coin) => `${currency[coin]} ${COIN_LABELS[coin]}`)
    .join(' · ');
}
