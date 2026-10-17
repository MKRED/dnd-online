import {
  formatEffectDuration,
  type CharacterEffectEntry,
  type Effect,
} from 'shared';

export function effectEntryName(entry: CharacterEffectEntry): string {
  if (entry.effect) return entry.effect.name;
  return entry.missing === 'hidden'
    ? 'Эффект скрыт автором'
    : 'Эффект удалён автором';
}

// Подсказка плашки: длительность из карточки или почему эффект не действует.
export function effectEntryHint(entry: CharacterEffectEntry): string {
  if (!entry.effect)
    return 'Не действует на персонажа. Плашку можно только снять';
  if (entry.inactive) {
    return 'Вы скрыли этот эффект: на персонажа он не действует';
  }
  return formatEffectDuration(entry.effect.duration);
}

// Что можно наложить: свои (и скрытые) и опубликованные чужие, как предметы в
// инвентарь. Свои опубликованные есть в обоих списках, поэтому чужие берём по автору.
export function effectCandidates(
  mine: Effect[],
  catalog: Effect[],
  userId: string,
): { mine: Effect[]; others: Effect[] } {
  const byName = (a: Effect, b: Effect) => a.name.localeCompare(b.name, 'ru');
  return {
    mine: [...mine].sort(byName),
    others: catalog.filter((e) => e.authorId !== userId).sort(byName),
  };
}
