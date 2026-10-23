// Откуда скопирована запись (docs/plan/blocks.md, этап 6б; с этапа 8а — и у моделей):
// id оригинала, его название и автор на момент копирования (для пометки, когда оригинал
// скрыт или удалён) и version — отпечаток вида и свойств оригинала, взятых в копию. По
// отпечатку, а не по времени правки: время записи ставят то часы базы, то часы сервера,
// и правка могла выглядеть «раньше» копии. Хранится в extra.origin записи.
export interface CatalogOriginLink {
  id: string;
  name: string;
  authorNickname: string;
  version: string;
}

// Ссылка на оригинал в карточке: available — оригинал виден копирующему (свой или
// опубликован), updated — вид или свойства оригинала уже не те, что в копии.
export interface CatalogOrigin extends CatalogOriginLink {
  available: boolean;
  updated: boolean;
}

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

// Ссылка на оригинал из extra; испорченная или её нет — запись не копия.
export function readCatalogOrigin(
  extra: Record<string, unknown>,
): CatalogOriginLink | null {
  const origin = extra.origin;
  if (typeof origin !== 'object' || origin === null) return null;
  const { id, name, authorNickname, version } = origin as Record<
    string,
    unknown
  >;
  return isText(id) && isText(name) && isText(authorNickname) && isText(version)
    ? { id, name, authorNickname, version }
    : null;
}
