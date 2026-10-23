import type { VoxelModelUsage } from 'shared';
import { voxelModelUsage } from '../../voxelModels';

// Вопрос перед удалением модели (docs/plan/blocks.md, этап 8б): обстановка с ней
// останется без вида, поэтому называем её.
export function modelDeleteConfirmText(
  name: string,
  usage: VoxelModelUsage,
): string {
  const question = `Удалить модель «${name}» безвозвратно?`;
  if (usage.furniture.length === 0) return question;
  const names = usage.furniture.map((entry) => `«${entry.name}»`).join(', ');
  return `${question}\n\nОна стоит в обстановке: ${names}. Там она пропадёт — обстановка останется без вида.`;
}

// Где стоит модель, спрашиваем у сервера прямо перед вопросом.
export async function loadModelDeleteConfirm(entry: {
  id: string;
  name: string;
}): Promise<string> {
  return modelDeleteConfirmText(entry.name, await voxelModelUsage(entry.id));
}
