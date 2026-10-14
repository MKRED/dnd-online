import type {
  Coin,
  Item,
  ItemCategory,
  ItemInput,
  ItemRarity,
  ItemVariant,
  TreasureKind,
} from 'shared';

// Значения формы. Числа — number | string: NumberInput отдаёт '' для пустого поля.
export interface ItemFormValues {
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  weight: number | string;
  // Пустая стоимость — у предмета нет цены.
  costAmount: number | string;
  costCoin: Coin;
  description: string;
  isPublic: boolean;
  // Поля категорий лежат в форме все сразу: при смене категории туда и обратно
  // введённое не теряется, а в запрос уходят только поля выбранной.
  satiety: number | string;
  // null — вид не выбран: Select отдаёт null, вид обязателен.
  treasureKind: TreasureKind | null;
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
    // Пусто, а не 0: насыщение у еды обязательно, пусть его укажут явно.
    satiety: item?.category === 'food' ? item.details.satiety : '',
    treasureKind: item?.category === 'treasure' ? item.details.kind : null,
  };
}

// Форма проверена до отправки, поэтому у сокровища вид уже выбран.
function toVariant(values: ItemFormValues): ItemVariant {
  switch (values.category) {
    case 'food':
      return { category: 'food', details: { satiety: Number(values.satiety) } };
    case 'treasure':
      return {
        category: 'treasure',
        details: { kind: values.treasureKind ?? 'trade_good' },
      };
    default:
      return { category: values.category, details: {} };
  }
}

export function toItemInput(values: ItemFormValues): ItemInput {
  return {
    name: values.name.trim(),
    ...toVariant(values),
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
