import type { BlockGroupUsage } from 'shared';
import { apiRequest } from '../../../lib/apiRequest';

const quoted = (names: string[]) => names.map((name) => `«${name}»`).join(', ');

// Вопрос перед удалением группы: её блоки на картах и сценах станут пустотой
// (docs/plan/blocks.md, «Решения»), поэтому называем, где они стоят.
export function blockDeleteConfirmText(
  name: string,
  usage: BlockGroupUsage,
): string {
  const question = `Удалить группу блоков «${name}» безвозвратно?`;
  const places = [
    usage.maps.length > 0 &&
      `на картах: ${quoted(usage.maps.map((map) => map.name))}`,
    usage.scenes.length > 0 &&
      `на сценах: ${usage.scenes
        .map((scene) => `«${scene.name}» (игра «${scene.gameName}»)`)
        .join(', ')}`,
  ].filter(Boolean);
  if (places.length === 0) return question;
  return `${question}\n\nЕё блоки стоят ${places.join('; ')}. Там они станут пустотой.`;
}

// Где стоят блоки, спрашиваем у сервера прямо перед вопросом: карточка могла открыться
// давно.
export async function loadBlockDeleteConfirm(entry: {
  id: string;
  name: string;
}): Promise<string> {
  const usage = await apiRequest<BlockGroupUsage>(
    `/block-groups/${entry.id}/usage`,
  );
  return blockDeleteConfirmText(entry.name, usage);
}
