import { ForbiddenException } from '@nestjs/common';
import {
  authoredEntry,
  type CatalogAccess,
  type Db,
} from './catalog-access.js';

// Кто пишет запись: браузер по сессии или нейросеть по API-токену.
export interface CatalogWriteOptions {
  viaApiToken?: boolean;
}

const TOKEN_PUBLICATION_ERROR =
  'Публиковать и скрывать записи через API-токен нельзя — сделайте это в интерфейсе';

// Флаги тела, которые вместе с записью публикуют или скрывают другие: состав набора,
// наборы с предметом, эффекты способности, способности с эффектом.
const LINKED_PUBLICATION_FLAGS = [
  'publishContents',
  'hidePacks',
  'publishEffects',
  'hideAbilities',
] as const;

type PublicationDto = { isPublic: boolean } & Partial<
  Record<(typeof LINKED_PUBLICATION_FLAGS)[number], boolean>
>;

// Через API-токен видимость не меняется (docs/plan/ai-access.md): новая запись — только
// скрытой, правка — с тем же признаком публикации, что уже стоит. PUT несёт признак
// всегда, поэтому «нельзя true» не годится: тогда нейросеть не могла бы править
// опубликованное, не скрыв его. entryId — null при создании. Чужую запись не трогаем:
// на неё ответит обычная проверка правки (403 или 404).
export async function keepPublicationForToken(
  db: Db,
  access: CatalogAccess,
  userId: string,
  entryId: string | null,
  dto: PublicationDto,
  options: CatalogWriteOptions,
): Promise<void> {
  if (!options.viaApiToken) return;
  if (LINKED_PUBLICATION_FLAGS.some((flag) => dto[flag])) {
    throw new ForbiddenException(TOKEN_PUBLICATION_ERROR);
  }
  let stored = false;
  if (entryId) {
    const [row] = await db
      .select({ isPublic: access.isPublic })
      .from(access.table)
      .where(authoredEntry(access, userId, entryId))
      .limit(1);
    if (!row) return;
    stored = row.isPublic as boolean;
  }
  if (dto.isPublic !== stored) {
    throw new ForbiddenException(TOKEN_PUBLICATION_ERROR);
  }
}
