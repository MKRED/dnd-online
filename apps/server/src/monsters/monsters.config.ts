import {
  DEFAULT_MONSTER_STAT_BLOCK,
  MONSTER_ROLES,
  MONSTER_TYPES,
  isMonsterStatBlock,
  readMonsterModelLink,
  type MonsterRecordFields,
  type MonsterRole,
  type MonsterType,
} from 'shared';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import type { CatalogEntriesConfig } from '../catalog/entries/catalog-entries.service.js';
import type { CatalogImageConfig } from '../catalog/images/catalog-image.config.js';
import { monsters, monsterImageTables } from '../database/schema/index.js';
import type { MonsterDto } from './dto/monster.dto.js';

// Каталог монстров на общем коде каталогов (docs/plan/done/monsters-npcs.md, этап 3).
export const MONSTER_ACCESS: CatalogAccess = {
  table: monsters,
  id: monsters.id,
  authorId: monsters.authorId,
  isPublic: monsters.isPublic,
  notFound: 'Монстр не найден',
  authorOnly: 'Менять монстра может только его автор',
};

// Тип записи, у которой он испорчен: первый в списке, лишь бы карточка открылась.
const FALLBACK_TYPE: MonsterType = MONSTER_TYPES[0];

// Тип существа — колонка category, стат-блок и роль — в extra, details пуст. Испорченный
// стат-блок читается целиком по умолчанию, испорченная роль — обычной: каталог не падает
// из-за одной записи.
export function toMonsterFields(
  category: string,
  _details: Record<string, unknown>,
  extra: Record<string, unknown>,
): MonsterRecordFields {
  return {
    category: MONSTER_TYPES.includes(category as MonsterType)
      ? (category as MonsterType)
      : FALLBACK_TYPE,
    statBlock: isMonsterStatBlock(extra.statBlock)
      ? extra.statBlock
      : DEFAULT_MONSTER_STAT_BLOCK,
    role: MONSTER_ROLES.includes(extra.role as MonsterRole)
      ? (extra.role as MonsterRole)
      : 'regular',
    model: readMonsterModelLink(extra.model),
  };
}

export const MONSTERS_CONFIG: CatalogEntriesConfig<
  MonsterRecordFields,
  MonsterDto
> = {
  catalog: 'monster',
  table: monsters,
  images: monsterImageTables,
  access: MONSTER_ACCESS,
  toVariant: toMonsterFields,
  // Без поля model в теле ссылка на модель остаётся прежней (docs/plan/done/monster-models.md):
  // MCP и старые клиенты её не шлют.
  keptExtra: ['model'],
  toStored: (dto) => ({
    category: dto.category,
    details: {},
    extra: {
      statBlock: dto.statBlock,
      role: dto.role,
      ...(dto.model !== undefined && { model: dto.model }),
    },
  }),
};

export const MONSTER_IMAGE_CONFIG: CatalogImageConfig = {
  catalog: 'monster',
  access: MONSTER_ACCESS,
  tables: monsterImageTables,
  noImage: 'У монстра нет картинки',
};
