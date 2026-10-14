import { NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { CharacterImage, CharacterMainImage } from 'shared';
import type {
  DatabaseService,
  DbTransaction,
} from '../database/database.service.js';
import { characterImages, characters } from '../database/schema/index.js';

type Db = DatabaseService['db'] | DbTransaction;
type CharacterImageRow = typeof characterImages.$inferSelect;

export const CHARACTER_NOT_FOUND = 'Персонаж не найден';
export const IMAGE_NOT_FOUND = 'Картинка не найдена';

// Проверка владельца. forUpdate блокирует строку персонажа до конца транзакции: правки
// галереи (счётчик лимита, порядок, смена основной) идут по очереди и не гоняются.
// Чужой персонаж неотличим от несуществующего.
export async function assertOwnedCharacter(
  db: Db,
  userId: string,
  characterId: string,
  { forUpdate }: { forUpdate: boolean },
): Promise<void> {
  const query = db
    .select({ id: characters.id })
    .from(characters)
    .where(and(eq(characters.id, characterId), eq(characters.userId, userId)))
    .limit(1);
  const [row] = forUpdate ? await query.for('update') : await query;
  if (!row) throw new NotFoundException(CHARACTER_NOT_FOUND);
}

// Картинка именно этого персонажа; владельца персонажа проверяют отдельно.
export async function findImage(
  db: Db,
  characterId: string,
  imageId: string,
): Promise<CharacterImageRow> {
  const [row] = await db
    .select()
    .from(characterImages)
    .where(
      and(
        eq(characterImages.id, imageId),
        eq(characterImages.characterId, characterId),
      ),
    )
    .limit(1);
  if (!row) throw new NotFoundException(IMAGE_NOT_FOUND);
  return row;
}

export function toCharacterImage(row: CharacterImageRow): CharacterImage {
  return {
    id: row.id,
    characterId: row.characterId,
    position: row.position,
    isMain: row.isMain,
    width: row.width,
    height: row.height,
    thumbCrop: row.thumbCrop,
    thumbVersion: row.thumbVersion,
    createdAt: row.createdAt.toISOString(),
  };
}

// Основные картинки сразу для нескольких персонажей — для списка и карточки персонажа.
export async function loadMainImages(
  db: Db,
  characterIds: string[],
): Promise<Map<string, CharacterMainImage>> {
  if (characterIds.length === 0) return new Map();
  const rows = await db
    .select({
      characterId: characterImages.characterId,
      id: characterImages.id,
      thumbVersion: characterImages.thumbVersion,
    })
    .from(characterImages)
    .where(
      and(
        inArray(characterImages.characterId, characterIds),
        eq(characterImages.isMain, true),
      ),
    );
  return new Map(
    rows.map(({ characterId, ...mainImage }) => [characterId, mainImage]),
  );
}
