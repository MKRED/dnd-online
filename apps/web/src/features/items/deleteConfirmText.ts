import type { Item } from 'shared';

const oneOf = (count: number) => count % 10 === 1 && count % 100 !== 11;

// «в 1 чужом наборе», «в 2 чужих наборах», «в 21 чужом наборе».
function othersPacksPhrase(count: number): string {
  return oneOf(count) ? `в ${count} чужом наборе` : `в ${count} чужих наборах`;
}

// «у 1 чужого персонажа», «у 2 чужих персонажей», «у 21 чужого персонажа».
export function othersCharactersPhrase(count: number): string {
  return oneOf(count)
    ? `у ${count} чужого персонажа`
    : `у ${count} чужих персонажей`;
}

// Удалённый предмет пропадает из всех наборов, своих и чужих (docs/plan/item-packs.md).
function packsNote(item: Item): string | null {
  const mine = item.packs?.mine.map((pack) => `«${pack.name}»`) ?? [];
  const others = item.packs?.othersCount ?? 0;
  if (mine.length === 0 && others === 0) return null;
  const where =
    mine.length === 0
      ? `Он лежит ${othersPacksPhrase(others)}.`
      : `Он лежит в ваших наборах: ${mine.join(', ')}${
          others > 0 ? ` — и ещё ${othersPacksPhrase(others)}` : ''
        }.`;
  return `${where} Из них он тоже пропадёт.`;
}

// У персонажей остаётся строка «Предмет удалён автором»
// (docs/plan/character-inventory.md).
function holdersNote(item: Item): string | null {
  const mine = item.holders?.mine.map((holder) => `«${holder.name}»`) ?? [];
  const others = item.holders?.othersCount ?? 0;
  if (mine.length === 0 && others === 0) return null;
  const where =
    mine.length === 0
      ? `Он лежит ${othersCharactersPhrase(others)}.`
      : `Он лежит у ваших персонажей: ${mine.join(', ')}${
          others > 0 ? ` — и ещё ${othersCharactersPhrase(others)}` : ''
        }.`;
  return `${where} В инвентаре останется строка «Предмет удалён автором».`;
}

// Подтверждение удаления: называем свои наборы и персонажей, где лежит предмет. Чужие —
// числом, их названия могут быть скрыты.
export function deleteConfirmText(item: Item): string {
  const question = `Удалить предмет «${item.name}» безвозвратно?`;
  const notes = [packsNote(item), holdersNote(item)].filter(Boolean);
  return [question, ...notes].join('\n\n');
}
