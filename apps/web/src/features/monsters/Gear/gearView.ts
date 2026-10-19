import type { MonsterItemEntry } from 'shared';

// Название строки снаряжения; у скрытого и удалённого — почему карточки нет.
export function gearEntryName(entry: MonsterItemEntry): string {
  if (entry.item) return entry.item.name;
  return entry.missing === 'hidden'
    ? 'Предмет скрыт автором'
    : 'Предмет удалён автором';
}
