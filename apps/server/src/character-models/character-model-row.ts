import { NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { CharacterModel } from 'shared';
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
