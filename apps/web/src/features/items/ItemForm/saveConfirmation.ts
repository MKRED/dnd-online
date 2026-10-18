import type { Item } from 'shared';
import type { ItemFormValues } from './itemFormValues';

// Что спросить перед сохранением (docs/plan/done/item-packs.md). Сервер без флагов ответил бы
// 409 на публикацию или скрыл бы предмет молча — форма спрашивает заранее.
export type SaveConfirmation =
  // Публикуем набор, а в составе свои скрытые предметы: опубликовать их вместе с ним.
  | { kind: 'publish'; hiddenNames: string[] }
  // Скрываем предмет, который лежит в опубликованных наборах или у чужих персонажей.
  | {
      kind: 'hide';
      ownPackNames: string[];
      othersCount: number;
      // У чужих персонажей скрытый предмет перестанет действовать
      // (docs/plan/done/character-inventory.md); у своих он виден автору и действует дальше.
      othersCharactersCount: number;
    };

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
  if (saved?.isPublic && !values.isPublic) {
    const ownPackNames = (saved.packs?.mine ?? [])
      .filter((pack) => pack.isPublic)
      .map((pack) => pack.name);
    const othersCount = saved.packs?.othersCount ?? 0;
    const othersCharactersCount = saved.holders?.othersCount ?? 0;
    if (
      ownPackNames.length > 0 ||
      othersCount > 0 ||
      othersCharactersCount > 0
    ) {
      return { kind: 'hide', ownPackNames, othersCount, othersCharactersCount };
    }
  }
  return null;
}
