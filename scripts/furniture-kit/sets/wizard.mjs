// Башня мага и лаборатория. Оси и «вперёд» — как в models.mjs.
import { Model } from '../voxels.mjs';

function flask(m, x, y, z, color, tall) {
  m.box(x, y, z, x + 3, y + 3, z + 3, color).box(
    x + 1,
    y + 3,
    z + 1,
    x + 2,
    y + 3 + tall,
    z + 2,
    '#cfe8f0',
  );
}

function alchemyTable() {
  const m = new Model([2, 1, 1]);
  m.box(0, 11, 0, 32, 13, 16, 'woodDark');
  for (const [x, z] of [
    [1, 1],
    [29, 1],
    [1, 13],
    [29, 13],
  ])
    m.box(x, 0, z, x + 2, 11, z + 2, 'woodDark');
  m.box(2, 4, 2, 30, 5, 14, 'wood');
  flask(m, 3, 13, 4, 'potion', 3);
  flask(m, 8, 13, 9, '#a03ad0', 2);
  flask(m, 13, 13, 3, 'red', 4);
  m.box(18, 13, 4, 20, 19, 6, 'iron')
    .box(17, 19, 4, 26, 20, 6, 'iron')
    .box(25, 13, 4, 26, 19, 5, 'iron');
  m.cyl(19, 5, 2.5, 13, 15, 'iron').box(19, 13, 4, 20, 14, 6, 'flame');
  m.box(22, 13, 9, 30, 14, 14, 'linen').box(23, 14, 10, 29, 15, 13, 'white');
  m.box(5, 5, 5, 9, 8, 9, 'bookRed').box(11, 5, 6, 14, 9, 10, 'bookGreen');
  return m.cell(0, 0, 0, 'stand').cell(1, 0, 0, 'stand');
}

function crystalBall() {
  const m = new Model([1, 1, 1]);
  m.box(4, 0, 4, 12, 2, 12, 'woodDark')
    .line(5, 2, 5, 7, 7, 7, 1, 'gold')
    .line(11, 2, 5, 9, 7, 7, 1, 'gold');
  m.line(8, 2, 11, 8, 7, 9, 1, 'gold');
  m.ball(8, 11, 8, 4.5, 4.5, 4.5, '#9fd8f0').ball(7, 12, 7, 2, 2, 2, '#d8f4ff');
  return m;
}

function globe() {
  const m = new Model([1, 1, 1]);
  m.box(5, 0, 5, 11, 1, 11, 'woodDark').box(7, 1, 7, 9, 4, 9, 'woodDark');
  m.ball(8, 10, 8, 5, 5, 5, '#3a6ab0');
  m.repaint((x, y, z, c) =>
    c === '#3a6ab0' && (x * 7 + y * 3 + z * 5) % 11 < 4 ? '#5a9a4a' : undefined,
  );
  for (let a = 0; a < 40; a++) {
    const ang = (a / 40) * Math.PI * 2;
    m.set(
      8,
      Math.round(10 + 6 * Math.sin(ang)),
      Math.round(8 + 6 * Math.cos(ang)),
      'gold',
    );
  }
  return m;
}

function telescope() {
  const m = new Model([1, 2, 1]);
  m.line(3, 0, 3, 8, 14, 8, 1, 'woodDark')
    .line(13, 0, 3, 8, 14, 8, 1, 'woodDark')
    .line(8, 0, 14, 8, 14, 8, 1, 'woodDark');
  m.line(8, 12, 12, 8, 26, 1, 3, 'gold').line(8, 10, 15, 8, 13, 11, 2, 'gold');
  m.box(7, 25, 0, 10, 28, 3, '#cfe8f0');
  return m;
}

function scrollBasket() {
  const m = new Model([1, 1, 1]);
  m.cyl(8, 8, 6, 0, 7, '#b07a45')
    .cyl(8, 8, 5, 1, 7, null)
    .cyl(8, 8, 6.4, 3, 4, '#8a5a30');
  for (const [x, z, h, c] of [
    [5, 6, 14, 'linen'],
    [9, 5, 12, 'white'],
    [7, 10, 15, 'linen'],
    [11, 9, 11, 'white'],
    [5, 10, 10, 'linen'],
  ]) {
    m.box(x, 1, z, x + 2, h, z + 2, c).box(
      x,
      h - 3,
      z,
      x + 2,
      h - 2,
      z + 2,
      'red',
    );
  }
  return m;
}

// Круг призыва 3×3 на полу: два кольца и знаки.
function summoningCircle() {
  const m = new Model([3, 1, 3]);
  for (let z = 0; z < 48; z++)
    for (let x = 0; x < 48; x++) {
      const d = Math.hypot(x + 0.5 - 24, z + 0.5 - 24);
      if ((d > 21 && d < 23) || (d > 16 && d < 17.2)) m.set(x, 0, z, '#a03ad0');
    }
  for (let a = 0; a < 5; a++) {
    const p = (k) => [
      24 + 16 * Math.cos(-Math.PI / 2 + (k * 4 * Math.PI) / 5),
      24 + 16 * Math.sin(-Math.PI / 2 + (k * 4 * Math.PI) / 5),
    ];
    const [x0, z0] = p(a);
    const [x1, z1] = p(a + 1);
    m.line(x0, 0.5, z0, x1, 0.5, z1, 1, '#c070f0');
  }
  for (let a = 0; a < 5; a++) {
    const ang = -Math.PI / 2 + (a * 2 * Math.PI) / 5;
    const x = Math.round(24 + 19.5 * Math.cos(ang));
    const z = Math.round(24 + 19.5 * Math.sin(ang));
    m.box(x - 1, 0, z - 1, x + 1, 1, z + 1, '#f0d040')
      .box(x, 0, z, x + 1, 4, z + 1, 'wax')
      .box(x, 4, z, x + 1, 5, z + 1, 'flameCore');
  }
  for (let x = 0; x < 3; x++)
    for (let z = 0; z < 3; z++) m.cell(x, 0, z, 'free');
  return m;
}

function owlCage() {
  const m = new Model([1, 1, 1]);
  m.box(7, 13, 7, 9, 16, 9, 'gold');
  m.cyl(8, 8, 5, 1, 2, 'gold')
    .cyl(8, 8, 4, 11, 12, 'gold')
    .box(7, 12, 7, 9, 13, 9, 'gold');
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    m.box(
      Math.round(8 + 4.5 * Math.cos(ang) - 0.5),
      2,
      Math.round(8 + 4.5 * Math.sin(ang) - 0.5),
      Math.round(8 + 4.5 * Math.cos(ang) + 0.5),
      11,
      Math.round(8 + 4.5 * Math.sin(ang) + 0.5),
      'gold',
    );
  }
  m.box(4, 4, 7, 12, 5, 9, 'woodDark');
  m.ball(8, 7.5, 8, 2, 2.5, 2, '#8a6a4a')
    .box(7, 8, 5, 8, 9, 6, '#f0d040')
    .box(8, 8, 5, 9, 9, 6, '#f0d040');
  m.box(7, 9, 6, 9, 10, 7, '#6a4a2a');
  return m;
}

function magicCrystal() {
  const m = new Model([1, 1, 1]);
  m.box(3, 0, 3, 13, 2, 13, 'stoneDark').box(5, 2, 5, 11, 4, 11, 'stone');
  for (let y = 5; y < 16; y++) {
    const r = y < 9 ? (y - 4) * 0.9 : (16 - y) * 0.55;
    m.box(
      Math.round(8 - r),
      y,
      Math.round(8 - r),
      Math.round(8 + r),
      y + 1,
      Math.round(8 + r),
      y % 3 ? '#7ad0f0' : '#b8ecff',
    );
  }
  return m;
}

function specimenShelf() {
  const m = new Model([1, 1, 1]);
  for (const y of [1, 9]) m.box(0, y, 10, 16, y + 1, 16, 'woodDark');
  for (const [x, y, c, s] of [
    [1, 2, '#9ac850', 'ash'],
    [6, 2, '#d0c070', 'white'],
    [11, 2, '#70b0c0', 'red'],
    [2, 10, '#c09ad0', 'potion'],
    [8, 10, '#9ac850', '#6a4a2a'],
  ]) {
    m.box(x, y, 11, x + 4, y + 5, 15, c)
      .box(x + 1, y + 1, 12, x + 3, y + 3, 14, s)
      .box(x, y + 5, 11, x + 4, y + 6, 15, 'woodLight');
  }
  m.box(13, 10, 12, 15, 13, 14, 'white').box(13, 13, 12, 15, 14, 14, 'ash');
  return m;
}

export default [
  [
    'Стол алхимика',
    'floor',
    'Стол на две клетки с колбами, перегонным кубом над огнём и записями. На него можно встать.',
    alchemyTable,
  ],
  [
    'Хрустальный шар',
    'floor',
    'Хрустальный шар на золотой треноге. Ставится на пол или на стол. Препятствие.',
    crystalBall,
  ],
  [
    'Глобус',
    'floor',
    'Глобус на подставке с золотым меридианом. Препятствие.',
    globe,
  ],
  [
    'Телескоп',
    'floor',
    'Золотой телескоп на треноге, смотрит вперёд и вверх. Препятствие.',
    telescope,
  ],
  [
    'Корзина со свитками',
    'floor',
    'Плетёная корзина со свитками, перевязанными красной лентой. Препятствие.',
    scrollBasket,
  ],
  [
    'Круг призыва',
    'floor',
    'Фиолетовый круг призыва со звездой и пятью свечами, 3 × 3 клетки. Не мешает ходить.',
    summoningCircle,
  ],
  [
    'Клетка с совой',
    'ceiling',
    'Золотая клетка с совой на цепи. Вешается под потолок.',
    owlCage,
  ],
  [
    'Магический кристалл',
    'floor',
    'Светящийся голубой кристалл на каменном постаменте. Препятствие.',
    magicCrystal,
  ],
  [
    'Полка с банками',
    'wall',
    'Полка с банками заспиртованных образцов и черепом. Вешается на стену.',
    specimenShelf,
  ],
];
