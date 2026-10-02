import type { MapOp, Vec3 } from 'shared';

// ВРЕМЕННО, до редактора мастера (этап 5 в docs/map.md): готовая постройка, чтобы
// на пустой карте было что посмотреть. Удалить вместе с кнопкой, когда появится редактор.
// Север — сторона -z. Земля — уровень y = 0, стоять можно на y = 1.

const set = (
  at: Vec3,
  block: string,
  rotation?: 0 | 90 | 180 | 270,
): MapOp => ({
  op: 'setBlock',
  at,
  block,
  rotation,
});

const fill = (from: Vec3, to: Vec3, block: string): MapOp => ({
  op: 'fillBox',
  from,
  to,
  block,
});

function tree(x: number, z: number): MapOp[] {
  return [
    fill([x, 1, z], [x, 3, z], 'wood_pillar'),
    fill([x - 1, 4, z - 1], [x + 1, 5, z + 1], 'grass'),
    set([x, 6, z], 'grass'),
  ];
}

// Двухэтажный дом 9×7: этажи по 3 блока, дверь в 2 блока (пропорции — docs/map.md,
// «Масштаб»), лестница, окна, дверь на север.
const house: MapOp[] = [
  fill([0, 0, 0], [8, 0, 6], 'stone'),
  { op: 'hollowBox', from: [0, 1, 0], to: [8, 9, 6], block: 'brick' },
  fill([1, 1, 1], [7, 1, 5], 'wood'),
  fill([1, 5, 1], [7, 5, 5], 'wood'),
  fill([4, 2, 0], [4, 3, 0], 'air'),
  set([2, 3, 0], 'glass'),
  set([6, 3, 0], 'glass'),
  set([2, 7, 0], 'glass'),
  set([6, 7, 0], 'glass'),
  set([8, 3, 3], 'glass'),
  set([0, 7, 3], 'glass'),
  // Лестница поднимается к северу (поворот 180°) на второй этаж: 4 ступени на 4 уровня.
  // Проём в перекрытии — над ступенями, где иначе персонаж упёрся бы головой.
  set([6, 2, 5], 'wood_stairs', 180),
  set([6, 3, 4], 'wood_stairs', 180),
  set([6, 4, 3], 'wood_stairs', 180),
  set([6, 5, 2], 'wood_stairs', 180),
  fill([6, 5, 3], [6, 5, 4], 'air'),
  fill([-1, 10, -1], [9, 10, 7], 'wood_slab'),
];

// Башня 5×5 высотой 10 с зубцами, дверь на юг.
const tower: MapOp[] = [
  { op: 'hollowBox', from: [14, 1, -14], to: [18, 10, -10], block: 'stone' },
  fill([16, 2, -10], [16, 3, -10], 'air'),
  set([16, 6, -10], 'glass'),
  set([14, 11, -14], 'stone'),
  set([16, 11, -14], 'stone'),
  set([18, 11, -14], 'stone'),
  set([14, 11, -12], 'stone'),
  set([18, 11, -12], 'stone'),
  set([14, 11, -10], 'stone'),
  set([16, 11, -10], 'stone'),
  set([18, 11, -10], 'stone'),
];

export const DEMO_VILLAGE_OPS: MapOp[] = [
  fill([-20, 0, -20], [24, 0, 16], 'grass'),
  fill([-21, -1, -21], [25, -1, 17], 'dirt'),
  ...house,
  ...tower,
  // Тропинка от двери дома к башне.
  fill([4, 0, -8], [4, 0, -1], 'sand'),
  fill([5, 0, -8], [16, 0, -8], 'sand'),
  fill([16, 0, -9], [16, 0, -9], 'sand'),
  // Замёрзший пруд.
  fill([-14, 0, 4], [-8, 0, 10], 'ice'),
  ...tree(-4, -6),
  ...tree(-10, -12),
  ...tree(12, 6),
  // Каменная ограда двора тонкими стенами вдоль южного края.
  fill([-2, 1, 9], [10, 1, 9], 'stone_wall'),
];
