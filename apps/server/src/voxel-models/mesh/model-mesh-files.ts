import { eq } from 'drizzle-orm';
import type { DbTransaction } from '../../database/database.service.js';
import { voxelModelMeshes } from '../../database/schema/index.js';

// Файл модели переезжает в копию вместе с записью (docs/plan/blocks.md, этап 9): копия
// модели, «Подтянуть обновления» и модели копии обстановки. Что нарисовать (extra.mesh)
// приходит копии с остальными полями вида; байты — отдельной таблицей, поэтому их
// переносят здесь. У оригинала файла нет — у копии его тоже не остаётся.
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
    return;
  }
  const values = { ...source, updatedAt: new Date() };
  await tx
    .insert(voxelModelMeshes)
    .values({ modelId: toId, ...values })
    .onConflictDoUpdate({ target: voxelModelMeshes.modelId, set: values });
}
