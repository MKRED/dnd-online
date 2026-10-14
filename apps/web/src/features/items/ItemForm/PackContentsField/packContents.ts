import {
  ITEM_PACK_MAX_QUANTITY,
  type Item,
  type PackEntry,
  type PackEntryItem,
} from 'shared';

// Строка состава в форме. Количество — number | string: NumberInput отдаёт '' для
// пустого поля, его ловит проверка формы.
export type FormPackEntry = Omit<PackEntry, 'quantity'> & {
  quantity: number | string;
};

// Краткая карточка предмета для строки состава — та же, что строит сервер.
export function toPackEntryItem(item: Item): PackEntryItem {
  return {
    name: item.name,
    category: item.category,
    weight: item.weight,
    isPublic: item.isPublic,
    image: item.image,
  };
}

// Выбранный предмет: новый — строкой с количеством 1 в конец, уже лежащий — +1 к
// количеству. Так повторный выбор не плодит строки, которые сервер всё равно отклонил бы.
export function addPackEntry(
  contents: FormPackEntry[],
  item: Item,
): FormPackEntry[] {
  const existing = contents.find((entry) => entry.itemId === item.id);
  if (!existing) {
    return [
      ...contents,
      { itemId: item.id, quantity: 1, item: toPackEntryItem(item) },
    ];
  }
  return contents.map((entry) =>
    entry === existing
      ? {
          ...entry,
          quantity: Math.min(
            (Number(entry.quantity) || 0) + 1,
            ITEM_PACK_MAX_QUANTITY,
          ),
        }
      : entry,
  );
}

export interface PackWeight {
  // Сумма «вес × количество» по строкам, которые видно.
  total: number;
  // В составе есть строки «скрыт автором»: их вес неизвестен, сумма — нижняя граница.
  partial: boolean;
}

export function packWeight(contents: FormPackEntry[]): PackWeight {
  let total = 0;
  for (const entry of contents) {
    if (entry.item) total += entry.item.weight * (Number(entry.quantity) || 0);
  }
  // Сотые, как у веса: 0.1 * 3 в двоичной арифметике — 0,30000000000000004.
  return {
    total: Math.round(total * 100) / 100,
    partial: contents.some((entry) => !entry.item),
  };
}

// Что можно положить в набор: свои и опубликованные чужие, без наборов (набор в наборе
// запрещён) и без самого предмета: его могут делать набором из другой категории.
// Списки «Мои» и «Каталог» пересекаются — свои опубликованные есть в обоих, поэтому
// чужие берём из каталога по автору.
export function packCandidates(
  mine: Item[],
  catalog: Item[],
  userId: string,
  selfId: string | null,
): { mine: Item[]; others: Item[] } {
  const fits = (item: Item) => item.category !== 'pack' && item.id !== selfId;
  const byName = (a: Item, b: Item) => a.name.localeCompare(b.name, 'ru');
  return {
    mine: mine.filter(fits).sort(byName),
    others: catalog
      .filter((item) => fits(item) && item.authorId !== userId)
      .sort(byName),
  };
}
