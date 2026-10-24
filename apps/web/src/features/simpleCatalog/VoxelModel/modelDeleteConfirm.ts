import type { VoxelModelUsage } from 'shared';
import { voxelModelUsage } from '../../voxelModels';

// Вопрос перед удалением модели (docs/plan/blocks.md, этап 8б): обстановка с ней
// останется без вида, монстры (docs/plan/done/monster-models.md) — с карточкой вместо модели,
// поэтому называем их.
export function modelDeleteConfirmText(
  name: string,
  usage: VoxelModelUsage,
): string {
  const names = (entries: { name: string }[]) =>
    entries.map((entry) => `«${entry.name}»`).join(', ');
  const lines = [`Удалить модель «${name}» безвозвратно?`];
  if (usage.furniture.length > 0)
    lines.push(
      `Она стоит в обстановке: ${names(usage.furniture)}. Там она пропадёт — обстановка останется без вида.`,
    );
  if (usage.monsters.length > 0)
    lines.push(
      `Она у монстров: ${names(usage.monsters)}. На карте вместо неё у них снова будет карточка.`,
    );
  return lines.join('\n\n');
}

// Где стоит модель, спрашиваем у сервера прямо перед вопросом.
export async function loadModelDeleteConfirm(entry: {
  id: string;
  name: string;
}): Promise<string> {
  return modelDeleteConfirmText(entry.name, await voxelModelUsage(entry.id));
}
