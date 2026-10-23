import { Fragment } from 'react';
import {
  LOCK_DC_LABELS,
  loadLabel,
  containerLoad,
  type Furniture,
} from 'shared';

const itemName = (entry: Furniture, itemId: string) => {
  const ref = entry.contentItems[itemId];
  if (!ref) return 'Предмет';
  if (ref.missing === null) return ref.name;
  return ref.missing === 'hidden' ? 'Скрыт автором' : 'Предмет удалён';
};

// Строки карточки контейнера-обстановки (этап 11): вместимость с грузом содержимого по
// умолчанию, замок и само содержимое. Значение лежит в абзаце — строки через перенос.
export function containerRows(entry: Furniture) {
  const container = entry.container;
  if (!container) return [];
  const load = containerLoad(container.contents, (itemId) => {
    const ref = entry.contentItems[itemId];
    return ref?.missing === null ? ref.weight : 0;
  });
  return [
    {
      label: 'Контейнер',
      value: `Груз по умолчанию: ${loadLabel(load, container.capacity)}`,
    },
    {
      label: 'Замок',
      value:
        container.lockDc === null ? 'Нет' : LOCK_DC_LABELS[container.lockDc],
    },
    {
      label: 'Содержимое',
      value: container.contents.length
        ? container.contents.map(({ itemId, quantity }, index) => (
            <Fragment key={itemId}>
              {index > 0 && <br />}
              {itemName(entry, itemId)} ×{quantity}
            </Fragment>
          ))
        : 'Пусто',
    },
  ];
}
