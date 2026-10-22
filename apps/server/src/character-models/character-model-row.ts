import { NotFoundException } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import type { CharacterModel, FigureModel } from 'shared';
import type { Db } from '../catalog/catalog-access.js';
import { characterModels } from '../database/schema/index.js';

export const MODEL_NOT_FOUND = 'У персонажа нет 3D-модели';

// Метаданные без байтов: модель весит мегабайты, а читают её только маршрутом файла.
export const modelColumns = {
  format: characterModels.format,
  size: characterModels.size,
  version: characterModels.version,
  color: characterModels.color,
  fit: characterModels.fit,
  updatedAt: characterModels.updatedAt,
};

type ModelRow = Omit<CharacterModel, 'updatedAt'> & { updatedAt: Date };

export function toCharacterModel(row: ModelRow): CharacterModel {
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}

export async function findModel(
  db: Db,
  characterId: string,
): Promise<CharacterModel | null> {
  const [row] = await db
    .select(modelColumns)
    .from(characterModels)
    .where(eq(characterModels.characterId, characterId))
    .limit(1);
  return row ? toCharacterModel(row) : null;
}

export async function requireModel(
  db: Db,
  characterId: string,
): Promise<CharacterModel> {
  const model = await findModel(db, characterId);
  if (!model) throw new NotFoundException(MODEL_NOT_FOUND);
  return model;
}

// Модели сразу для нескольких персонажей — для фигурок на сцене игры.
export async function loadFigureModels(
  db: Db,
  characterIds: string[],
): Promise<Map<string, FigureModel>> {
  if (characterIds.length === 0) return new Map();
  const rows = await db
    .select({
      characterId: characterModels.characterId,
      format: characterModels.format,
      version: characterModels.version,
      color: characterModels.color,
      fit: characterModels.fit,
    })
    .from(characterModels)
    .where(inArray(characterModels.characterId, characterIds));
  return new Map(rows.map(({ characterId, ...model }) => [characterId, model]));
}
