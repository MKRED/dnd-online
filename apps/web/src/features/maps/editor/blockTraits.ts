import {
  BASE_BLOCKS,
  HAZARD_TRIGGER,
  hazardLabel,
  type BlockCatalog,
} from 'shared';

// Что блок делает с тем, кто по нему идёт: в списке блоков этого не видно.
// catalog — каталог карты: у своих блоков свойства группы.
export function blockTraits(
  name: string,
  catalog: BlockCatalog = BASE_BLOCKS,
): string | null {
  const block = catalog.describe(name);
  if (!block) return null;
  const { hazard, movementCost } = block.traits;
  const traits = [
    hazard && `Опасный: ${hazardLabel(hazard)} — тому, ${HAZARD_TRIGGER}.`,
    movementCost === 2 && 'Труднопроходимый: шаг стоит 10 футов.',
  ].filter(Boolean);
  return traits.length ? traits.join(' ') : null;
}
