import { STL_DEFAULT_COLOR, type ModelMesh, type VoxelModel } from 'shared';
import { errorMessage } from '../../../../lib/apiRequest';
import {
  loadMeshSnapshot,
  patchModelMesh,
  removeModelMesh,
  uploadModelMesh,
  voxelModelsApi,
} from '../../../voxelModels';
import type { MeshDraft } from './meshDraft';

const sameFit = (a: ModelMesh['fit'], b: ModelMesh['fit']) =>
  a.up === b.up && a.turn === b.turn;

// Файл модели после сохранения записи (docs/plan/blocks.md, этап 9): новый файл
// загружается, цвет и вписывание правятся, убранный — удаляется. Воксели из файла уже
// ушли с записью. Ошибка — текстом для формы, null — всё сохранено. Следом — снимок
// модели для списка (этап 9г): после каждого сохранения с файлом, так он не отстаёт ни
// от файла, ни от размера модели.
export async function saveModelMesh(
  saved: VoxelModel,
  draft: MeshDraft | null,
): Promise<string | null> {
  try {
    if (!draft) {
      if (saved.mesh) await removeModelMesh(saved.id);
      if (saved.mesh && saved.image) await voxelModelsApi.deleteImage(saved.id);
      return null;
    }
    let current = saved.mesh ?? null;
    if (draft.source.kind === 'file')
      current = await uploadModelMesh(saved.id, draft.source.file);
    if (!current) return null;
    const color =
      draft.format === 'stl' && draft.color !== current.color
        ? (draft.color ?? STL_DEFAULT_COLOR)
        : undefined;
    const fit = sameFit(draft.fit, current.fit) ? undefined : draft.fit;
    if (color !== undefined || fit)
      await patchModelMesh(saved.id, { color, fit });
    await saveSnapshot(saved, draft);
    return null;
  } catch (err: unknown) {
    console.error('Failed to save the model file', err);
    return errorMessage(err, 'Не удалось сохранить файл модели');
  }
}

// Без снимка список покажет воксели, как раньше: модель уже сохранена, поэтому ошибка
// снимка форму не останавливает — только пишется в консоль.
async function saveSnapshot(saved: VoxelModel, draft: MeshDraft) {
  try {
    const snapshot = await (
      await loadMeshSnapshot()
    )(saved, { source: draft.source, fit: draft.fit, color: draft.color });
    if (!snapshot) return;
    const file = new File([snapshot], 'snapshot.png', { type: 'image/png' });
    await voxelModelsApi.uploadImage(saved.id, file);
  } catch (err: unknown) {
    console.error('Failed to save the model snapshot', err);
  }
}
