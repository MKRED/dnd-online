import type { GameEventPayloads } from 'shared';
import { LOCATION_LABELS } from '../../characters/Inventory/inventoryView';

type Inventory = GameEventPayloads['character.inventory'];

// Инвентарь героя мастером (docs/plan/gm-items.md, этап 1): что положили, переложили,
// поменяли или убрали. item — null, если строки уже нет или предмет скрыт.
export function inventoryEventText({ intent, result }: Inventory): string {
  const { change } = intent;
  const who = result.character.name;
  const name = result.item?.name ?? 'предмет';
  switch (change.kind) {
    case 'add': {
      const what = change.unpack ? `состав «${name}»` : name;
      const where = LOCATION_LABELS[change.location].toLowerCase();
      return `Положено: ${who} — ${what} ×${change.quantity}, ${where}`;
    }
    case 'move':
      return `Переложено: ${who} — ${name} ×${change.quantity}, ${
        change.location === 'stash' ? 'в хранилище' : 'при себе'
      }`;
    case 'quantity':
      return `Количество: ${who} — ${name}, теперь ${change.quantity}`;
    case 'remove':
      return `Убрано: ${who} — ${name}`;
  }
}
