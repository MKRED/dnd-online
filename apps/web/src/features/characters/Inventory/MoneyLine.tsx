import type { CharacterCurrency } from 'shared';
import SheetField from '../CharacterSheet/SheetField';
import { formatMoney } from './money';

// Деньги под инвентарём; меняются формой персонажа.
function MoneyLine({ currency }: { currency: CharacterCurrency }) {
  const money = formatMoney(currency);
  return money ? <SheetField label="Деньги">{money}</SheetField> : null;
}

export default MoneyLine;
