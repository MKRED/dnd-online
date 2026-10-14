import type { ThumbCrop } from './images.js';

// Предметы (docs/plan/items.md): общий каталог. Общие поля у всех предметов одинаковые,
// поля категории лежат в details — у каждой категории свои. Справка по весу, стоимости
// и монетам с источниками — docs/dnd/items.md.

// Ключи категорий для хранения; русские названия живут в web. «Базовый» — всё, что не
// подходит под другие. Остальные добавляем по одной (план, раздел «Категории»).
export const ITEM_CATEGORIES = ['basic', 'food', 'material', 'quest'] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

// Категории без своих полей: details у них пустой объект (docs/plan/items-filters.md).
export const PLAIN_ITEM_CATEGORIES = [
  'basic',
  'material',
  'quest',
] as const satisfies readonly ItemCategory[];
export type PlainItemCategory = (typeof PLAIN_ITEM_CATEGORIES)[number];
export type PlainItemDetails = Record<string, never>;

// Еда и напитки: насыщение — целые очки, как припасы в Baldur's Gate 3. Отступление от
// книги, где норма в фунтах на день по размеру существа (docs/dnd/items.md). Сколько
// очков нужно на отдых, пока не считаем.
export interface FoodItemDetails {
  satiety: number;
}
export const ITEM_SATIETY_MAX = 1000;

// Размеченное объединение: по category понятно, какие поля лежат в details.
export type ItemVariant =
  | { category: PlainItemCategory; details: PlainItemDetails }
  | { category: 'food'; details: FoodItemDetails };
export type ItemDetails = ItemVariant['details'];

// Монеты — те же ключи, что у кошелька персонажа (CharacterCurrency).
export const COINS = ['cp', 'sp', 'ep', 'gp', 'pp'] as const;
export type Coin = (typeof COINS)[number];

// Курс монет в медных (правила 2024, docs/dnd/items.md): нужен, чтобы сравнивать цены
// в разных монетах.
export const COIN_VALUE_IN_CP: Record<Coin, number> = {
  cp: 1,
  sp: 10,
  ep: 50,
  gp: 100,
  pp: 1000,
};

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

// Картинка предмета — одна, в двух вариантах WebP: full — для просмотра, thumb —
// квадрат 256×256 для карточки. Вырез миниатюры (ThumbCrop, в пикселях full) может
// выходить за края картинки: поля прозрачные, так длинный меч вписывается целиком.
export const ITEM_IMAGE_VARIANTS = ['full', 'thumb'] as const;
export type ItemImageVariant = (typeof ITEM_IMAGE_VARIANTS)[number];

export interface ItemImage {
  // Растёт при замене картинки и смене выреза: идёт в адрес обоих вариантов, чтобы
  // браузер не показал старую из кеша.
  version: number;
  // Размеры варианта full.
  width: number;
  height: number;
  thumbCrop: ThumbCrop;
}

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
  image: ItemImage | null;
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
