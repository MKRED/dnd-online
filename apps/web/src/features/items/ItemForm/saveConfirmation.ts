import type { Item } from 'shared';
import type { ItemFormValues } from './itemFormValues';

// Что спросить перед сохранением (docs/plan/item-packs.md). Сервер без флагов ответил бы
// 409 на публикацию или скрыл бы предмет молча — форма спрашивает заранее.
export type SaveConfirmation =
  // Публикуем набор, а в составе свои скрытые предметы: опубликовать их вместе с ним.
  | { kind: 'publish'; hiddenNames: string[] }
  // Скрываем предмет, который лежит в опубликованных наборах.
  | { kind: 'hide'; ownPackNames: string[]; othersCount: number };

// Флаги запроса, которые выбирает ответ на вопрос.
export interface SaveFlags {
  publishContents?: boolean;
  hidePacks?: boolean;
}

export function saveConfirmation(
  values: ItemFormValues,
  saved: Item | null,
): SaveConfirmation | null {
  if (values.category === 'pack' && values.isPublic) {
    // Чужие скрытые приходят без карточки (item: null) — их не дают сохранить раньше.
    const hiddenNames = values.packContents.flatMap((entry) =>
      entry.item && !entry.item.isPublic ? [entry.item.name] : [],
    );
    if (hiddenNames.length > 0) return { kind: 'publish', hiddenNames };
  }
  // Скрывают только опубликованный: новый предмет ни в каких наборах не лежит.
  if (saved?.isPublic && !values.isPublic && saved.packs) {
    const ownPackNames = saved.packs.mine
      .filter((pack) => pack.isPublic)
      .map((pack) => pack.name);
    const { othersCount } = saved.packs;
    if (ownPackNames.length > 0 || othersCount > 0) {
      return { kind: 'hide', ownPackNames, othersCount };
    }
  }
  return null;
}
