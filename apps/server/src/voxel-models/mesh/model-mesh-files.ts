import { eq } from 'drizzle-orm';
import type { DbTransaction } from '../../database/database.service.js';
import {
  voxelModelImageTables,
  voxelModelMeshes,
} from '../../database/schema/index.js';

// Файл модели переезжает в копию вместе с записью (docs/plan/blocks.md, этап 9): копия
// модели, «Подтянуть обновления» и модели копии обстановки. Что нарисовать (extra.mesh)
// приходит копии с остальными полями вида; байты — отдельной таблицей, поэтому их
// переносят здесь. У оригинала файла нет — у копии его тоже не остаётся. Так же —
// картинка записи: у модели с файлом это её снимок для списка (этап 9г).
export async function copyModelMesh(
  tx: DbTransaction,
  fromId: string,
  toId: string,
): Promise<void> {
  const [source] = await tx
    .select({
      format: voxelModelMeshes.format,
      size: voxelModelMeshes.size,
      data: voxelModelMeshes.data,
    })
    .from(voxelModelMeshes)
    .where(eq(voxelModelMeshes.modelId, fromId));
  if (!source) {
    await tx.delete(voxelModelMeshes).where(eq(voxelModelMeshes.modelId, toId));
  } else {
    const values = { ...source, updatedAt: new Date() };
    await tx
      .insert(voxelModelMeshes)
      .values({ modelId: toId, ...values })
      .onConflictDoUpdate({ target: voxelModelMeshes.modelId, set: values });
  }
  await copyModelImage(tx, fromId, toId);
}

async function copyModelImage(
  tx: DbTransaction,
  fromId: string,
  toId: string,
): Promise<void> {
  const { images, files } = voxelModelImageTables;
  const [image] = await tx
    .select({
      width: images.width,
      height: images.height,
      thumbCrop: images.thumbCrop,
    })
    .from(images)
    .where(eq(images.ownerId, fromId));
  const [previous] = await tx
    .select({ version: images.version })
    .from(images)
    .where(eq(images.ownerId, toId));
  // Строки файлов уходят каскадом вместе со строкой картинки.
  await tx.delete(images).where(eq(images.ownerId, toId));
  if (!image) return;
  // Версия копии только растёт: клиент кэширует картинку по ней навсегда.
  await tx
    .insert(images)
    .values({ ownerId: toId, ...image, version: (previous?.version ?? 0) + 1 });
  const bytes = await tx
    .select({ variant: files.variant, data: files.data })
    .from(files)
    .where(eq(files.ownerId, fromId));
  if (bytes.length)
    await tx
      .insert(files)
      .values(bytes.map((row) => ({ ownerId: toId, ...row })));
}
