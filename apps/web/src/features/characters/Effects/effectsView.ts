import { formatEffectDuration, type Effect } from 'shared';
import type { EffectLinkEntry } from './effectsApi';

// На ком эффект — для подсказок плашки.
export type EffectOwnerKind = 'character' | 'monster';
const ON_OWNER: Record<EffectOwnerKind, string> = {
  character: 'на персонажа',
  monster: 'на монстра',
};

export function effectEntryName(entry: EffectLinkEntry): string {
  if (entry.effect) return entry.effect.name;
  return entry.missing === 'hidden'
    ? 'Эффект скрыт автором'
    : 'Эффект удалён автором';
}

// Подсказка плашки: длительность из карточки или почему эффект не действует.
export function effectEntryHint(
  entry: EffectLinkEntry,
  owner: EffectOwnerKind,
): string {
  if (!entry.effect)
    return `Не действует ${ON_OWNER[owner]}. Плашку можно только снять`;
  if (entry.inactive) {
    return `Вы скрыли этот эффект: ${ON_OWNER[owner]} он не действует`;
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
