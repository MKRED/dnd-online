import { createHash } from 'node:crypto';

// Отпечаток вида и свойств записи — того, что «Подтянуть обновления» переносит в копию
// (docs/plan/blocks.md, этап 6б; у моделей — с этапа 8а): свойства (details) и вид (extra
// без ссылки на свой оригинал). Ключи сортируются: порядок ключей jsonb не должен менять отпечаток.
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stable((value as Record<string, unknown>)[key])]),
  );
}

export function catalogVersion(entry: {
  details: Record<string, unknown>;
  extra: Record<string, unknown>;
}): string {
  const look = { ...entry.extra };
  delete look.origin;
  return createHash('sha256')
    .update(JSON.stringify(stable({ details: entry.details, look })))
    .digest('hex')
    .slice(0, 32);
}
