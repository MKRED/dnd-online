import type { CatalogEntryFields, CatalogEntryInputFields } from './catalog.js';
import {
  readCatalogOrigin,
  type CatalogOrigin,
  type CatalogOriginLink,
} from './catalogOrigin.js';
import {
  BLOCK_TEXTURE_FACES,
  HAZARD_NAMES,
  SHAPE_LOOK_NAMES,
  type BlockGroupInfo,
  type BlockShapeLooks,
  type BlockTextures,
  type HazardName,
  type ShapeLookName,
} from './map/customBlocks.js';
import { MATERIALS, type MaterialName } from './map/materials.js';

// Группа своих блоков в справочнике (docs/plan/blocks.md, этап 3): запись каталога с
// видом (базовый материал и основной цвет) и свойствами для правил, общими для всех форм.
export type BlockGroupFields = Omit<BlockGroupInfo, 'id' | 'name'>;
export type BlockGroupInput = CatalogEntryInputFields & BlockGroupFields;

// Ссылка копии группы на оригинал — общая с моделями (catalogOrigin.ts). Хранится в
// extra.origin; в BlockGroupFields не входит.
export type BlockGroupOriginLink = CatalogOriginLink;
export type BlockGroupOrigin = CatalogOrigin;

export type BlockGroup = CatalogEntryFields &
  BlockGroupFields & { origin: BlockGroupOrigin | null };

// Пределы прочности: КД объектов в глоссарии 2024 — от 11 до 23 (docs/dnd/terrain.md),
// ХП крупного прочного — 27; запас сверху — для магических стен и домашних правил.
export const BLOCK_ARMOR_CLASS_MAX = 30;
export const BLOCK_HIT_POINTS_MAX = 1000;

export function isBlockLook(value: unknown): value is MaterialName {
  return typeof value === 'string' && Object.hasOwn(MATERIALS, value);
}

export function isBlockColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

const inRange = (value: unknown, max: number) =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= max;

export function isBlockDurability(
  value: unknown,
): value is BlockGroupFields['durability'] {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const { armorClass, hitPoints } = value as Record<string, unknown>;
  return (
    Object.keys(value).length === 2 &&
    inRange(armorClass, BLOCK_ARMOR_CLASS_MAX) &&
    inRange(hitPoints, BLOCK_HIT_POINTS_MAX)
  );
}

// 1024 байта в base64 — 1368 знаков, два последних — «==».
const TEXTURE_TILE = /^[A-Za-z0-9+/]{1366}==$/;

export function isBlockTextures(value: unknown): value is BlockTextures | null {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const faces = value as Record<string, unknown>;
  return (
    Object.keys(faces).length === BLOCK_TEXTURE_FACES.length &&
    BLOCK_TEXTURE_FACES.every(
      (face) =>
        typeof faces[face] === 'string' && TEXTURE_TILE.test(faces[face]),
    )
  );
}

// Свои виды форм: только формы кроме куба, у каждой — настоящие текстуры (не null) и
// основной цвет.
export function isBlockShapeLooks(value: unknown): value is BlockShapeLooks {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  return Object.entries(value).every(([shape, look]) => {
    if (!SHAPE_LOOK_NAMES.includes(shape as ShapeLookName)) return false;
    if (typeof look !== 'object' || look === null) return false;
    const { textures, color } = look as Record<string, unknown>;
    return (
      Object.keys(look).length === 2 &&
      textures !== null &&
      isBlockTextures(textures) &&
      isBlockColor(color)
    );
  });
}

export function isHazardName(value: unknown): value is HazardName {
  return HAZARD_NAMES.includes(value as HazardName);
}

// Поля группы из базы. Испорченное поле получает значение «как у камня» — справочник
// не падает из-за одной записи, как и другие каталоги.
export function readBlockGroupFields(
  details: Record<string, unknown>,
  extra: Record<string, unknown>,
): BlockGroupFields {
  const look = isBlockLook(extra.look) ? extra.look : 'stone';
  return {
    look,
    color: isBlockColor(extra.color) ? extra.color : MATERIALS[look].color,
    opaque: typeof details.opaque === 'boolean' ? details.opaque : true,
    durability: isBlockDurability(details.durability)
      ? details.durability
      : null,
    flammable: details.flammable === true,
    movementCost: details.movementCost === 2 ? 2 : 1,
    climbable: details.climbable === true,
    hazard: isHazardName(details.hazard) ? details.hazard : null,
    textures:
      extra.textures !== undefined && isBlockTextures(extra.textures)
        ? extra.textures
        : null,
    shapes: isBlockShapeLooks(extra.shapes) ? extra.shapes : {},
  };
}

export const readBlockGroupOrigin = readCatalogOrigin;

export function toBlockGroupInfo(
  group: { id: string; name: string } & BlockGroupFields,
): BlockGroupInfo {
  return {
    id: group.id,
    name: group.name,
    look: group.look,
    color: group.color,
    opaque: group.opaque,
    durability: group.durability,
    flammable: group.flammable,
    movementCost: group.movementCost,
    climbable: group.climbable,
    hazard: group.hazard,
    textures: group.textures,
    shapes: group.shapes,
  };
}

// Где стоят блоки группы: перед удалением мастера предупреждают, что там они станут
// пустотой. Сцены — только действующие (перезапущенные старые копии не в счёт).
export interface BlockGroupUsage {
  maps: { id: string; name: string }[];
  scenes: { id: string; name: string; gameId: string; gameName: string }[];
}
