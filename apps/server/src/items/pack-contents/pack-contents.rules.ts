import type { ItemCategory } from 'shared';

export const PACK_ITEM_NOT_FOUND = 'Предмет из состава набора не найден';
export const PACK_IN_PACK = 'Набор нельзя положить в другой набор';
// Предмет может лежать и в чужих наборах, убрать его оттуда автор не может — поэтому
// без совета «сначала уберите».
export const PACK_ITEM_IN_PACK =
  'Предмет лежит в наборах — набором он стать не может';

// Как набор публикуется: isPublic — сам набор; publishContents — пользователь
// согласился опубликовать вместе с ним свои скрытые предметы из состава.
export interface PackPublication {
  isPublic: boolean;
  publishContents: boolean;
}

// Предмет из состава, как его нашёл запрос с условием видимости для автора набора.
export interface FoundPackItem {
  id: string;
  category: ItemCategory;
}

// Можно ли положить эти предметы в набор. found — только те, что автор набора видит:
// свои и опубликованные чужие. Чужой скрытый неотличим от несуществующего — так id
// чужих скрытых предметов нельзя подобрать перебором.
export function packContentsError(
  requestedIds: readonly string[],
  found: readonly FoundPackItem[],
): string | null {
  const foundIds = new Set(found.map((item) => item.id));
  if (requestedIds.some((id) => !foundIds.has(id))) return PACK_ITEM_NOT_FOUND;
  // Набор в наборе запрещён, как и в книге; заодно это исключает циклы.
  if (found.some((item) => item.category === 'pack')) return PACK_IN_PACK;
  return null;
}

// 409 при публикации набора со скрытыми предметами: называем их, чтобы было понятно, что
// публиковать. Форма ловит это сама и предлагает опубликовать их вместе с набором.
export function hiddenContentsError(
  hidden: readonly { name: string }[],
): string {
  return `Сначала опубликуйте предметы из состава: ${hidden
    .map((item) => item.name)
    .join(', ')}`;
}
