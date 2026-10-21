import { getBlock, HAZARD_TRIGGER, hazardLabel, MATERIALS } from 'shared';

// Что блок делает с тем, кто по нему идёт: в списке блоков этого не видно.
export function blockTraits(name: string): string | null {
  const block = getBlock(name);
  if (!block) return null;
  const { hazard, movementCost } = MATERIALS[block.material];
  const traits = [
    hazard && `Опасный: ${hazardLabel(hazard)} — тому, ${HAZARD_TRIGGER}.`,
    movementCost === 2 && 'Труднопроходимый: шаг стоит 10 футов.',
  ].filter(Boolean);
  return traits.length ? traits.join(' ') : null;
}
