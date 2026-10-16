// Источники записи каталога — предмета, способности, эффекта: откуда она взята. Каждый —
// одна строка: текст («Книга игрока 2024, стр. 42») или ссылка. Решено с пользователем
// 2026-10-17: одна строка, а не название плюс ссылка — проще заполнять.

// Лимиты общие для формы и сервера. 500 символов — с запасом для длинных адресов.
export const CATALOG_SOURCES_MAX = 10;
export const CATALOG_SOURCE_MAX_LENGTH = 500;

// Пустых строк и пробелов по краям в базе нет: форма их убирает, сервер не пропускает.
export function isCatalogSources(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= CATALOG_SOURCES_MAX &&
    value.every(
      (source) =>
        typeof source === 'string' &&
        source.length > 0 &&
        source.length <= CATALOG_SOURCE_MAX_LENGTH &&
        source.trim() === source,
    )
  );
}

// Ссылка — только если вся строка адрес http или https с хостом. Иначе это текст: так
// в карточку не попадёт javascript: и прочие схемы, а «см. https://…» останется текстом.
export function sourceLink(source: string): string | null {
  const trimmed = source.trim();
  if (/\s/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.hostname ? url.href : null;
  } catch {
    // Не разбирается как адрес — значит, это текст.
    return null;
  }
}

// Текст ссылки: строка, как её ввели (кириллица в адресе не превращается в %D0…), без
// «https://» и косой черты в конце.
export const sourceLinkLabel = (source: string) =>
  source
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
