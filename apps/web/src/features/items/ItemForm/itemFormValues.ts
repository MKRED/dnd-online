import type {
  Coin,
  Item,
  ItemInput,
  ItemRarity,
  PlainItemCategory,
} from 'shared';

// Значения формы. Числа — number | string: NumberInput отдаёт '' для пустого поля.
export interface ItemFormValues {
  name: string;
  // Пока ни у одной категории нет своих полей; когда появятся, они добавятся сюда же.
  category: PlainItemCategory;
  rarity: ItemRarity;
  weight: number | string;
  // Пустая стоимость — у предмета нет цены.
  costAmount: number | string;
  costCoin: Coin;
  description: string;
  isPublic: boolean;
}

export function toFormValues(item: Item | null): ItemFormValues {
  return {
    name: item?.name ?? '',
    category: item?.category ?? 'basic',
    rarity: item?.rarity ?? 'none',
    weight: item?.weight ?? 0,
    costAmount: item?.cost?.amount ?? '',
    // Золото — самая частая монета в ценах книги.
    costCoin: item?.cost?.coin ?? 'gp',
    description: item?.description ?? '',
    isPublic: item?.isPublic ?? false,
  };
}

// details пустые: у выбираемых сейчас категорий своих полей нет.
export function toItemInput(values: ItemFormValues): ItemInput {
  return {
    name: values.name.trim(),
    category: values.category,
    details: {},
    rarity: values.rarity,
    weight: values.weight === '' ? 0 : Number(values.weight),
    cost:
      values.costAmount === ''
        ? null
        : { amount: Number(values.costAmount), coin: values.costCoin },
    description: values.description.trim(),
    isPublic: values.isPublic,
  };
}
