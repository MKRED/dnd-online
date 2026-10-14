import type { Item } from 'shared';

// «в 1 чужом наборе», «в 2 чужих наборах», «в 21 чужом наборе».
function othersPhrase(count: number): string {
  const one = count % 10 === 1 && count % 100 !== 11;
  return one ? `в ${count} чужом наборе` : `в ${count} чужих наборах`;
}

// Подтверждение удаления: удалённый предмет пропадает из всех наборов, своих и чужих
// (docs/plan/item-packs.md), поэтому называем их. Чужие — числом, их названия могут
// быть скрыты.
export function deleteConfirmText(item: Item): string {
  const question = `Удалить предмет «${item.name}» безвозвратно?`;
  const mine = item.packs?.mine.map((pack) => `«${pack.name}»`) ?? [];
  const others = item.packs?.othersCount ?? 0;
  if (mine.length === 0 && others === 0) return question;
  const where =
    mine.length === 0
      ? `Он лежит ${othersPhrase(others)}.`
      : `Он лежит в ваших наборах: ${mine.join(', ')}${
          others > 0 ? ` — и ещё ${othersPhrase(others)}` : ''
        }.`;
  return `${question}\n\n${where} Из них он тоже пропадёт.`;
}
