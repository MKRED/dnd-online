import {
  ITEM_COST_MAX_AMOUNT,
  ITEM_DESCRIPTION_MAX_LENGTH,
  ITEM_MAX_WEIGHT,
  ITEM_NAME_MAX_LENGTH,
  ITEM_SATIETY_MAX,
  type ItemCategory,
} from 'shared';

// Те же правила, что у сервера (ItemDto): форма ловит ошибку до отправки, тексты те же.
export const validateItemForm = {
  name: (value: string) => {
    const length = value.trim().length;
    return length >= 1 && length <= ITEM_NAME_MAX_LENGTH
      ? null
      : `Название предмета — от 1 до ${ITEM_NAME_MAX_LENGTH} символов`;
  },
  weight: (value: number | string) => {
    if (value === '') return null;
    const weight = Number(value);
    if (weight < 0) return 'Вес не может быть отрицательным';
    if (weight > ITEM_MAX_WEIGHT)
      return `Вес — не больше ${ITEM_MAX_WEIGHT} фнт.`;
    // Сравнение с допуском: 0.29 * 100 в двоичной арифметике — 28,999…
    return Math.abs(Math.round(weight * 100) - weight * 100) < 1e-6
      ? null
      : 'Вес — не больше двух знаков после запятой';
  },
  costAmount: (value: number | string) => {
    if (value === '') return null;
    const amount = Number(value);
    if (!Number.isInteger(amount)) return 'Стоимость — целое число';
    if (amount < 0) return 'Стоимость не может быть отрицательной';
    return amount > ITEM_COST_MAX_AMOUNT
      ? `Стоимость — не больше ${ITEM_COST_MAX_AMOUNT}`
      : null;
  },
  // Насыщение проверяем только у еды: у других категорий поле скрыто и в запрос не идёт.
  satiety: (value: number | string, values: { category: ItemCategory }) => {
    if (values.category !== 'food') return null;
    const satiety = value === '' ? NaN : Number(value);
    return Number.isInteger(satiety) &&
      satiety >= 0 &&
      satiety <= ITEM_SATIETY_MAX
      ? null
      : `Насыщение — целое число от 0 до ${ITEM_SATIETY_MAX}`;
  },
  description: (value: string) =>
    value.trim().length > ITEM_DESCRIPTION_MAX_LENGTH
      ? `Описание — не длиннее ${ITEM_DESCRIPTION_MAX_LENGTH} символов`
      : null,
};
