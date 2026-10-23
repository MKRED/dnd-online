import {
  blockInfo,
  HAZARD_TRIGGER,
  hazardLabel,
  readCell,
  SHAPE_LABELS,
  type SizedMapState,
  type Vec3,
} from 'shared';

// Блок под курсором в «Просмотре» (docs/plan/scene-page.md, этап 3): что это за блок и
// что он делает в правилах — то, чего не видно глазом.
export interface CursorBlock {
  cell: Vec3;
  // null — в клетке пусто (воздух над землёй).
  label: string | null;
  shape: string | null;
  color: string | null;
  traits: string[];
}

export function cursorBlock(state: SizedMapState, cell: Vec3): CursorBlock {
  const info = blockInfo(state, readCell(state.store, cell));
  if (!info) return { cell, label: null, shape: null, color: null, traits: [] };
  const { traits } = info;
  const lines = [
    traits.opaque ? 'закрывает обзор' : 'обзор не закрывает',
    traits.movementCost === 2 && 'труднопроходимый: шаг стоит 10 футов',
    traits.climbable && 'можно лезть',
    traits.flammable && 'горит',
    traits.hazard &&
      `опасный: ${hazardLabel(traits.hazard)} — тому, ${HAZARD_TRIGGER}`,
    traits.durability &&
      `КД ${traits.durability.armorClass}, ХП ${traits.durability.hitPoints}`,
  ].filter((line): line is string => typeof line === 'string');
  return {
    cell,
    label: info.label,
    shape: SHAPE_LABELS[info.shape],
    color: traits.color,
    traits: lines,
  };
}
