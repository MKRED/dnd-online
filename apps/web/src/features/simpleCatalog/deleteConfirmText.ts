import type { Effect } from 'shared';
import type { SimpleEntry } from './simpleCatalogs';

// «в 1 чужой способности», «в 2 чужих способностях», «в 21 чужой способности».
function othersAbilitiesPhrase(count: number): string {
  return count % 10 === 1 && count % 100 !== 11
    ? `в ${count} чужой способности`
    : `в ${count} чужих способностях`;
}

// Подтверждение удаления эффекта: удалённый эффект пропадает из всех способностей,
// своих и чужих (docs/plan/done/abilities.md, этап 8). Свои — по названию, чужие — числом.
export function effectDeleteConfirmText(entry: SimpleEntry): string {
  const question = `Удалить эффект «${entry.name}» безвозвратно?`;
  const { abilities } = entry as Effect;
  const mine = abilities?.mine.map((ability) => `«${ability.name}»`) ?? [];
  const others = abilities?.othersCount ?? 0;
  if (mine.length === 0 && others === 0) return question;
  const where =
    mine.length === 0
      ? `Он стоит ${othersAbilitiesPhrase(others)}.`
      : `Он стоит в ваших способностях: ${mine.join(', ')}${
          others > 0 ? ` — и ещё ${othersAbilitiesPhrase(others)}` : ''
        }.`;
  return `${question}\n\n${where} Из них он тоже пропадёт.`;
}
