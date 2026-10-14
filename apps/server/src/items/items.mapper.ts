import {
  TREASURE_KINDS,
  type Item,
  type ItemCategory,
  type ItemImage,
  type ItemVariant,
  type PackEntry,
  type PackEntryInput,
  type TreasureKind,
} from 'shared';
import type { itemImages, items } from '../database/schema/index.js';
import type { ItemDto } from './dto/item.dto.js';

type ItemRow = typeof items.$inferSelect;
type NewItemRow = typeof items.$inferInsert;

type ItemImageRow = typeof itemImages.$inferSelect;

// Поля категории из базы. Еда, сохранённая до появления насыщения (2026-10-14), лежит с
// пустыми details — читаем её как насыщение 0, а не правим строки миграцией. Состав
// набора лежит не в details, а в своей таблице — его передаёт сервис.
export function toItemVariant(
  category: ItemCategory,
  details: Record<string, unknown>,
  packContents: PackEntry[] = [],
): ItemVariant {
  if (category === 'food') {
    const { satiety } = details as { satiety?: unknown };
    return {
      category,
      details: { satiety: typeof satiety === 'number' ? satiety : 0 },
    };
  }
  if (category === 'treasure') {
    const { kind } = details as { kind?: unknown };
    // Сервер пишет только проверенный вид; запасной — на случай ручной правки базы.
    return {
      category,
      details: {
        kind: TREASURE_KINDS.includes(kind as TreasureKind)
          ? (kind as TreasureKind)
          : 'trade_good',
      },
    };
  }
  if (category === 'container') {
    const { capacity } = details as { capacity?: unknown };
    return {
      category,
      details: { capacity: typeof capacity === 'number' ? capacity : null },
    };
  }
  if (category === 'pack') {
    return { category, details: { contents: packContents } };
  }
  return { category, details: {} };
}

// Метаданные картинки без байтов — для карточки предмета и строк состава набора.
export function toItemImage(image: ItemImageRow | null): ItemImage | null {
  return image
    ? {
        version: image.version,
        width: image.width,
        height: image.height,
        thumbCrop: image.thumbCrop,
      }
    : null;
}

// Стоимость в базе — две колонки (check-ограничение держит их в паре), в API — объект.
export function toItem(
  row: ItemRow,
  authorNickname: string,
  image: ItemImageRow | null = null,
  packContents: PackEntry[] = [],
): Item {
  return {
    id: row.id,
    authorId: row.authorId,
    authorNickname,
    isPublic: row.isPublic,
    name: row.name,
    ...toItemVariant(row.category, row.details, packContents),
    rarity: row.rarity,
    weight: row.weight,
    cost:
      row.costAmount !== null && row.costCoin !== null
        ? { amount: row.costAmount, coin: row.costCoin }
        : null,
    description: row.description,
    image: toItemImage(image),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Поля предмета из DTO — общая часть создания и полного редактирования (PUT).
export function toItemValues(dto: ItemDto): Omit<NewItemRow, 'authorId'> {
  return {
    name: dto.name,
    category: dto.category,
    rarity: dto.rarity,
    // Состав набора пишется в item_pack_entries, в details у набора пусто. Копия, а не
    // сам объект: у интерфейсов полей нет индексной сигнатуры, которую ждёт колонка.
    details: dto.category === 'pack' ? {} : { ...dto.details },
    weight: dto.weight,
    // null, а не undefined: при редактировании снятая цена должна стереться.
    costAmount: dto.cost?.amount ?? null,
    costCoin: dto.cost?.coin ?? null,
    description: dto.description ?? '',
    isPublic: dto.isPublic,
  };
}

// Состав набора из DTO; null — предмет не набор. DTO — класс, а не размеченное
// объединение, поэтому связь category и details здесь приходится утверждать вручную:
// её уже проверил DetailsForCategory.
export function packContentsOf(dto: ItemDto): PackEntryInput[] | null {
  return dto.category === 'pack'
    ? (dto.details as { contents: PackEntryInput[] }).contents
    : null;
}
