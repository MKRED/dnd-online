import { IsBoolean, IsIn, ValidateBy } from 'class-validator';
import {
  BLOCK_ARMOR_CLASS_MAX,
  BLOCK_HIT_POINTS_MAX,
  isBlockColor,
  isBlockDurability,
  isBlockLook,
  isBlockShapeLooks,
  isBlockTextures,
  isHazardName,
  type BlockGroupFields,
  type BlockShapeLooks,
  type BlockTextures,
  type HazardName,
  type MaterialName,
} from 'shared';
import { CatalogEntryDto } from '../../catalog/entries/dto/catalog-entry.dto.js';

// Создание и полное редактирование группы блоков — одно тело; все поля обязательны,
// чтобы забытое поле не превратилось молча в умолчание.
export class BlockGroupDto extends CatalogEntryDto implements BlockGroupFields {
  @ValidateBy({
    name: 'blockLook',
    validator: {
      validate: isBlockLook,
      defaultMessage: () => 'Вид блока — один из базовых материалов',
    },
  })
  look: MaterialName;

  @ValidateBy({
    name: 'blockColor',
    validator: {
      validate: isBlockColor,
      defaultMessage: () => 'Основной цвет — в виде #rrggbb',
    },
  })
  color: string;

  @IsBoolean({ message: 'Признак «перекрывает обзор» — да или нет' })
  opaque: boolean;

  @ValidateBy({
    name: 'blockDurability',
    validator: {
      validate: isBlockDurability,
      defaultMessage: () =>
        `Прочность — null или КД от 1 до ${BLOCK_ARMOR_CLASS_MAX} и ХП от 1 до ${BLOCK_HIT_POINTS_MAX}`,
    },
  })
  durability: BlockGroupFields['durability'];

  @IsBoolean({ message: 'Признак «горит» — да или нет' })
  flammable: boolean;

  @IsIn([1, 2], { message: 'Цена шага — 1 или 2 (труднопроходимая)' })
  movementCost: 1 | 2;

  @IsBoolean({ message: 'Признак «можно лазать» — да или нет' })
  climbable: boolean;

  // null — безопасный блок; поле обязательно, как и остальные.
  @ValidateBy({
    name: 'blockHazard',
    validator: {
      validate: (value) => value === null || isHazardName(value),
      defaultMessage: () =>
        'Опасность — null или одна из базовых: lava, acid, swamp, fire',
    },
  })
  hazard: HazardName | null;

  // null — узор основы в основном цвете (docs/plan/blocks.md, этап 4б).
  @ValidateBy({
    name: 'blockTextures',
    validator: {
      validate: isBlockTextures,
      defaultMessage: () =>
        'Текстуры — null или {top, side, bottom}: плитки 16×16 RGBA в base64 (по 1024 байта)',
    },
  })
  textures: BlockTextures | null;

  // Свой вид отдельных форм (docs/plan/blocks.md, этап 5б); {} — все формы рисуются
  // текстурами группы.
  @ValidateBy({
    name: 'blockShapeLooks',
    validator: {
      validate: isBlockShapeLooks,
      defaultMessage: () =>
        'Виды форм — объект {форма: {textures, color}}: формы кроме куба (slab, slab_top, wall, pillar, stairs), текстуры {top, side, bottom} и цвет #rrggbb; {} — без своих',
    },
  })
  shapes: BlockShapeLooks;
}
