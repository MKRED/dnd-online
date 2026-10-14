// Предметы (docs/plan/items.md): общий каталог. Общие поля у всех предметов одинаковые,
// поля категории лежат в details — у каждой категории свои. Справка по весу, стоимости
// и монетам с источниками — docs/dnd/items.md.

// Ключи категорий для хранения; русские названия живут в web. Пока одна: «Базовый» —
// всё, что не подходит под другие. Остальные добавляем по одной (план, раздел «Категории»).
export const ITEM_CATEGORIES = ['basic'] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

// Поля категории. У «Базового» своих полей нет — details пустой объект.
export type BasicItemDetails = Record<string, never>;

// Размеченное объединение: по category понятно, какие поля лежат в details.
export type ItemVariant = { category: 'basic'; details: BasicItemDetails };
export type ItemDetails = ItemVariant['details'];

// Монеты — те же ключи, что у кошелька персонажа (CharacterCurrency).
export const COINS = ['cp', 'sp', 'ep', 'gp', 'pp'] as const;
export type Coin = (typeof COINS)[number];

// Редкость. По правилам она есть только у магических предметов, у снаряжения её нет —
// это 'none'. 'common' («Обычный») — редкость магического предмета, а не «простой
// предмет», поэтому значением по умолчанию быть не может.
export const ITEM_RARITIES = [
  'none',
  'common',
  'uncommon',
  'rare',
  'very_rare',
  'legendary',
  'artifact',
] as const;
export type ItemRarity = (typeof ITEM_RARITIES)[number];

// Стоимость храним как в книге («2 СМ»), а не пересчитанной в медь.
export interface ItemCost {
  amount: number;
  coin: Coin;
}

// Лимиты общие для формы и сервера.
export const ITEM_NAME_MAX_LENGTH = 100;
export const ITEM_DESCRIPTION_MAX_LENGTH = 5000;
// Вес в фунтах, до сотых: в книге бывает 1/4 фнт. (дротик). Колонка numeric(8, 2).
export const ITEM_MAX_WEIGHT = 10_000;
export const ITEM_COST_MAX_AMOUNT = 1_000_000;

export type Item = ItemVariant & {
  id: string;
  authorId: string;
  authorNickname: string;
  // Скрытый предмет видит только автор; опубликованный — все в каталоге.
  isPublic: boolean;
  name: string;
  rarity: ItemRarity;
  // Ноль — «без веса» (в книге пишут «—»).
  weight: number;
  cost: ItemCost | null;
  description: string;
  createdAt: string;
  updatedAt: string;
};

// Тело создания и полного редактирования.
export type ItemInput = ItemVariant & {
  name: string;
  rarity: ItemRarity;
  weight: number;
  cost: ItemCost | null;
  description: string;
  isPublic: boolean;
};

// Какой список запрашиваем: свои предметы (и скрытые) или опубликованные всех.
export const ITEM_LIST_SCOPES = ['mine', 'catalog'] as const;
export type ItemListScope = (typeof ITEM_LIST_SCOPES)[number];
