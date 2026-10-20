import type { ContainerLook, ObjectItem } from './mapObject.js';

// Груз контейнера на карте в фунтах — правило дома (docs/dnd/items.md, «Контейнеры
// на карте»). В книге 2024 груз есть только у мешка (30 фнт. в 1 куб. фт.), у сундука и
// бочки — объём, ящика нет вовсе; остальное пересчитано по 30 фнт. на кубический фут.
export const CONTAINER_CAPACITY: Record<ContainerLook, number> = {
  sack: 30,
  barrel: 120,
  crate: 240,
  chest: 360,
};

// Вес предметов в контейнере, фунты до сотых. weightOf — вес предмета, который видит
// правящий; скрытый автором и удалённый не считаются, как в грузе персонажа
// (docs/dnd/carrying.md).
export function containerLoad(
  items: readonly ObjectItem[],
  weightOf: (itemId: string) => number,
): number {
  let hundredths = 0;
  // В сотых целыми: 0.1 × 3 в дробях даёт 0.30000000000000004.
  for (const { itemId, quantity } of items) {
    hundredths += Math.round(weightOf(itemId) * 100) * quantity;
  }
  return hundredths / 100;
}

const pounds = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

// «45,5 из 30 фнт.» — для ошибки правки, предупреждения сводки и панели редактора.
export function loadLabel(load: number, capacity: number): string {
  return `${pounds.format(load)} из ${pounds.format(capacity)} фнт.`;
}
