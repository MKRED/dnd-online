// Лес и дикая местность. Оси и «вперёд» — как в models.mjs.
import { Model, rng, speckle } from '../voxels.mjs';

const LEAVES = ['#2f6b2a', '#3b7d33', '#285a24'];
const PINE = ['#1f4d2b', '#245a32', '#1a4024'];

function oak() {
  const m = new Model([3, 5, 3]);
  m.cyl(24, 24, 3.5, 0, 46, '#5a3d24').cyl(24, 24, 5, 0, 3, '#5a3d24');
  m.line(24, 34, 24, 13, 44, 18, 3, '#5a3d24').line(
    24,
    38,
    24,
    35,
    47,
    30,
    3,
    '#5a3d24',
  );
  for (const [x, y, z, r] of [
    [24, 56, 24, 15],
    [13, 50, 18, 10],
    [35, 52, 30, 10],
    [22, 64, 30, 10],
    [30, 60, 14, 10],
  ])
    m.ball(x, y, z, r, r * 0.75, r, LEAVES[0]);
  speckle(m, 11, LEAVES);
  return m;
}

// Ель: ствол и ярусы конусов.
function spruce() {
  const m = new Model([3, 5, 3]);
  m.cyl(24, 24, 2.5, 0, 72, '#4a3220');
  for (let tier = 0; tier < 6; tier++) {
    const y0 = 12 + tier * 10;
    const r0 = 20 - tier * 3;
    for (let y = 0; y < 14; y++)
      m.cyl(24, 24, r0 * (1 - y / 14) + 1, y0 + y, y0 + y + 1, PINE[0]);
  }
  m.box(23, 72, 23, 25, 78, 25, PINE[0]);
  speckle(m, 5, PINE);
  return m;
}

function birch() {
  const m = new Model([2, 4, 2]);
  m.cyl(16, 16, 2.5, 0, 50, '#e8e4da');
  const rand = rng(9);
  m.repaint((x, y, z, c) =>
    c === '#e8e4da' && rand() < 0.15 ? '#2b2b2b' : undefined,
  );
  for (const [x, y, z, r] of [
    [16, 50, 16, 11],
    [10, 44, 12, 7],
    [22, 46, 20, 7],
  ])
    m.ball(x, y, z, r, r * 0.8, r, '#6a9a3a');
  speckle(m, 13, ['#6a9a3a', '#7fae45', '#5a8a30']);
  return m;
}

function log() {
  const m = new Model([3, 1, 1]);
  for (let x = 1; x < 47; x++)
    for (let y = 0; y < 12; y++)
      for (let z = 2; z < 14; z++) {
        const dy = y + 0.5 - 6;
        const dz = z + 0.5 - 8;
        if (dy * dy + dz * dz <= 36) m.set(x, y, z, '#5a3d24');
      }
  for (const x of [1, 46])
    for (let y = 0; y < 12; y++)
      for (let z = 2; z < 14; z++) {
        const d = (y + 0.5 - 6) ** 2 + (z + 0.5 - 8) ** 2;
        if (d <= 36)
          m.set(x, y, z, d < 9 ? '#c49a6c' : d < 20 ? '#a87a4a' : '#5a3d24');
      }
  m.box(10, 11, 6, 14, 13, 10, '#3b7d33').box(30, 11, 7, 33, 12, 11, '#3b7d33');
  m.line(20, 8, 8, 24, 14, 4, 2, '#5a3d24');
  return m.cell(0, 0, 0, 'stand').cell(1, 0, 0, 'stand').cell(2, 0, 0, 'stand');
}

function stump() {
  const m = new Model([1, 1, 1]);
  m.cyl(8, 8, 6, 0, 7, '#5a3d24').cyl(8, 8, 7.5, 0, 2, '#5a3d24');
  m.cyl(8, 8, 5, 6, 7, '#c49a6c')
    .cyl(8, 8, 3, 6, 7, '#a87a4a')
    .cyl(8, 8, 1, 6, 7, '#c49a6c');
  m.box(1, 0, 7, 3, 1, 9, '#5a3d24').box(12, 0, 2, 14, 1, 4, '#5a3d24');
  m.box(10, 7, 4, 12, 8, 6, '#c2410c').box(10, 8, 4, 12, 9, 5, '#f3ead2');
  return m.cell(0, 0, 0, 'stand');
}

function bush() {
  const m = new Model([1, 1, 1]);
  m.ball(8, 5, 8, 7.5, 5.5, 7.5, LEAVES[0])
    .ball(5, 8, 6, 4, 4, 4, LEAVES[1])
    .ball(11, 7, 11, 4, 4, 4, LEAVES[1]);
  speckle(m, 21, LEAVES);
  for (const [x, y, z] of [
    [3, 7, 3],
    [12, 6, 2],
    [6, 10, 12],
    [13, 9, 9],
  ])
    m.box(x, y, z, x + 1, y + 1, z + 1, 'red');
  return m.cell(0, 0, 0, 'difficult');
}

function boulder() {
  const m = new Model([1, 1, 1]);
  m.ball(8, 5, 8, 7.5, 6.5, 7, 'stone')
    .ball(5, 9, 7, 4, 3, 4, 'stone')
    .ball(11, 2, 12, 4, 2.5, 3.5, 'stoneDark');
  speckle(m, 31, ['stone', 'stoneDark', 'stone', '#7a7a7d']);
  m.box(3, 10, 6, 7, 11, 9, '#4f7a3a');
  return m;
}

function mushrooms() {
  const m = new Model([1, 1, 1]);
  for (const [x, z, h, r, cap] of [
    [4, 5, 4, 2.5, 'red'],
    [10, 9, 6, 3.5, 'red'],
    [6, 12, 3, 2, '#b07a45'],
    [12, 3, 3, 2, '#b07a45'],
  ]) {
    m.cyl(x, z, 0.9, 0, h, 'white')
      .cyl(x, z, r, h, h + 1, cap)
      .cyl(x, z, r - 1, h + 1, h + 2, cap);
    if (cap === 'red')
      m.box(
        Math.round(x - 1),
        h + 1,
        Math.round(z),
        Math.round(x),
        h + 2,
        Math.round(z) + 1,
        'white',
      );
  }
  return m.cell(0, 0, 0, 'free');
}

function tallGrass() {
  const m = new Model([1, 1, 1]);
  const rand = rng(41);
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(rand() * 16);
    const z = Math.floor(rand() * 16);
    const h = 5 + Math.floor(rand() * 9);
    m.box(
      x,
      0,
      z,
      x + 1,
      h,
      z + 1,
      ['#4f8a34', '#5f9a3e', '#3d7228', '#7a9a3e'][i % 4],
    );
  }
  for (const [x, z] of [
    [3, 4],
    [11, 12],
  ])
    m.box(x, 0, z, x + 1, 6, z + 1, '#2f6b2a').box(
      x - 2,
      6,
      z,
      x + 3,
      7,
      z + 1,
      '#2f6b2a',
    );
  return m.cell(0, 0, 0, 'difficult');
}

// Палатка 2×2: вход спереди.
function tent() {
  const m = new Model([2, 2, 2]);
  for (let y = 0; y < 20; y++) {
    const half = 15 - y * 0.75;
    m.box(
      Math.round(16 - half),
      y,
      2,
      Math.round(16 + half),
      y + 1,
      30,
      '#a08a5c',
    );
    m.box(
      Math.round(16 - half) + 1,
      y,
      3,
      Math.round(16 + half) - 1,
      y + 1,
      29,
      null,
    );
  }
  m.box(15, 0, 1, 17, 22, 3, 'woodDark').box(15, 0, 29, 17, 22, 31, 'woodDark');
  m.box(15, 20, 1, 17, 21, 31, 'woodDark');
  for (let y = 0; y < 16; y++) {
    const half = 15 - y * 0.75;
    m.box(
      Math.round(16 - half),
      y,
      30,
      Math.round(16 + half),
      y + 1,
      31,
      '#8f7a4e',
    );
  }
  m.box(4, 0, 4, 28, 1, 28, '#6b5a3a');
  return m;
}

function bedroll() {
  const m = new Model([1, 1, 2]);
  m.box(3, 0, 2, 13, 1, 26, '#3d6a4a').box(3, 1, 4, 13, 2, 18, '#4f7a5a');
  lyingRoll(m);
  return m.cell(0, 0, 0, 'free').cell(0, 0, 1, 'free');
}

function lyingRoll(m) {
  for (let x = 3; x < 13; x++)
    for (let y = 0; y < 6; y++)
      for (let z = 25; z < 31; z++)
        if ((y - 2.5) ** 2 + (z - 27.5) ** 2 <= 8) m.set(x, y, z, '#4f7a5a');
  m.box(5, 0, 24, 6, 6, 31, 'woodDark').box(10, 0, 24, 11, 6, 31, 'woodDark');
}

function signpost() {
  const m = new Model([1, 2, 1]);
  m.box(7, 0, 7, 9, 28, 9, 'woodDark');
  m.box(1, 22, 7, 13, 25, 8, 'woodLight').box(
    13,
    23,
    7,
    14,
    24,
    8,
    'woodLight',
  );
  m.box(4, 16, 3, 5, 19, 13, 'woodLight').box(4, 17, 2, 5, 18, 3, 'woodLight');
  m.box(3, 23, 6, 10, 24, 7, 'woodDark').box(3, 17, 5, 4, 18, 11, 'woodDark');
  return m;
}

function well() {
  const m = new Model([1, 2, 1]);
  m.cyl(8, 8, 7.5, 0, 8, 'stone')
    .cyl(8, 8, 5.5, 1, 8, null)
    .cyl(8, 8, 5.5, 1, 2, 'bookBlue');
  speckle(m, 51, ['stone', 'stoneDark', 'stoneLight']);
  m.box(1, 8, 7, 2, 22, 9, 'woodDark').box(14, 8, 7, 15, 22, 9, 'woodDark');
  m.box(1, 20, 8, 15, 21, 9, 'wood').box(7, 13, 8, 9, 20, 9, 'linen');
  m.box(6, 10, 6, 10, 13, 10, 'wood');
  for (let y = 22; y < 27; y++)
    m.box(0 + (y - 22), y, 3, 16 - (y - 22), y + 1, 13, '#7a3b2a');
  return m;
}

function fence() {
  const m = new Model([2, 1, 1]);
  for (const x of [1, 15, 29]) m.box(x, 0, 7, x + 2, 13, 9, 'woodDark');
  for (const y of [4, 9]) m.box(0, y, 7, 32, y + 2, 8, 'wood');
  return m;
}

export default [
  [
    'Дуб',
    'floor',
    'Раскидистый дуб высотой в пять клеток. Клетки ствола и кроны — препятствие.',
    oak,
  ],
  ['Ель', 'floor', 'Высокая ель, 3 × 5 × 3 клетки. Препятствие.', spruce],
  ['Берёза', 'floor', 'Берёза высотой в четыре клетки. Препятствие.', birch],
  [
    'Поваленное бревно',
    'floor',
    'Бревно на три клетки с мхом. На него можно встать.',
    log,
  ],
  [
    'Пень',
    'floor',
    'Пень с годовыми кольцами и грибом. На него можно встать.',
    stump,
  ],
  ['Куст', 'floor', 'Густой куст с ягодами. Клетка труднопроходима.', bush],
  ['Валун', 'floor', 'Валун с мхом. Препятствие.', boulder],
  ['Грибы', 'floor', 'Мухоморы и боровики. Не мешают ходить.', mushrooms],
  [
    'Высокая трава',
    'floor',
    'Высокая трава и папоротник. Клетка труднопроходима.',
    tallGrass,
  ],
  [
    'Палатка',
    'floor',
    'Походная палатка 2 × 2 клетки, вход спереди. Препятствие.',
    tent,
  ],
  [
    'Спальный мешок',
    'floor',
    'Расстеленный спальный мешок со скаткой, 1 × 2 клетки. Не мешает ходить.',
    bedroll,
  ],
  [
    'Указатель',
    'floor',
    'Столб с табличками на перекрёстке. Препятствие.',
    signpost,
  ],
  [
    'Колодец',
    'floor',
    'Каменный колодец с воротом и крышей. Препятствие.',
    well,
  ],
  [
    'Изгородь',
    'floor',
    'Деревянная изгородь на две клетки. Препятствие.',
    fence,
  ],
];
