// Корабль и порт. Оси и «вперёд» — как в models.mjs.
import { Model } from '../voxels.mjs';

// Мачта с реей и подобранным парусом.
function mast() {
  const m = new Model([3, 5, 1]);
  m.cyl(24, 8, 2.5, 0, 80, 'woodDark').box(20, 0, 4, 28, 3, 12, 'woodDark');
  m.box(2, 56, 7, 46, 58, 9, 'wood');
  for (let y = 40; y < 56; y++)
    m.box(
      4 + (56 - y) / 4,
      y,
      9,
      44 - (56 - y) / 4,
      y + 1,
      11,
      y % 4 ? 'white' : 'linen',
    );
  m.box(18, 70, 2, 30, 72, 14, 'wood')
    .box(18, 72, 2, 30, 76, 3, 'wood')
    .box(18, 72, 13, 30, 76, 14, 'wood');
  m.box(18, 72, 2, 19, 76, 14, 'wood').box(29, 72, 2, 30, 76, 14, 'wood');
  m.line(2, 57, 8, 22, 4, 8, 1, 'linen').line(46, 57, 8, 26, 4, 8, 1, 'linen');
  m.box(23, 76, 7, 25, 80, 9, 'red');
  return m;
}

function helm() {
  const m = new Model([1, 2, 1]);
  m.box(5, 0, 6, 11, 2, 12, 'woodDark').box(6, 2, 8, 10, 16, 12, 'wood');
  for (let a = 0; a < 64; a++) {
    const ang = (a / 64) * Math.PI * 2;
    m.box(
      Math.round(8 + 6 * Math.cos(ang)),
      Math.round(18 + 6 * Math.sin(ang)),
      6,
      Math.round(8 + 6 * Math.cos(ang)) + 1,
      Math.round(18 + 6 * Math.sin(ang)) + 1,
      8,
      'woodLight',
    );
  }
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    m.line(
      8,
      18,
      7,
      8 + 9 * Math.cos(ang),
      18 + 9 * Math.sin(ang),
      7,
      1,
      'woodDark',
    );
  }
  m.box(7, 17, 5, 9, 19, 9, 'gold');
  return m;
}

// Пушка на лафете, ствол смотрит вперёд.
function cannon() {
  const m = new Model([1, 1, 2]);
  m.box(2, 2, 6, 14, 6, 30, 'woodDark');
  for (const z of [8, 24])
    for (const x of [1, 13]) m.box(x, 0, z, x + 2, 5, z + 5, 'wood');
  for (let z = 0; z < 28; z++) {
    const r = 4.5 - z * 0.05;
    for (let x = 0; x < 16; x++)
      for (let y = 4; y < 16; y++)
        if ((x + 0.5 - 8) ** 2 + (y + 0.5 - 9) ** 2 <= r * r)
          m.set(x, y, z, 'iron');
  }
  for (let x = 0; x < 16; x++)
    for (let y = 4; y < 16; y++)
      if ((x + 0.5 - 8) ** 2 + (y + 0.5 - 9) ** 2 <= 4) m.set(x, y, 0, 'ash');
  m.box(7, 9, 28, 9, 11, 31, 'iron');
  m.ball(4, 2, 2, 2, 2, 2, 'iron').ball(9, 2, 3, 2, 2, 2, 'iron');
  return m;
}

// Якорь, прислонённый к стене.
function anchor() {
  const m = new Model([1, 2, 1]);
  m.box(7, 4, 12, 9, 28, 14, 'iron').box(3, 24, 12, 13, 26, 14, 'iron');
  m.box(6, 28, 12, 10, 31, 14, 'iron').box(7, 29, 12, 9, 30, 14, null);
  for (let a = 0; a <= 32; a++) {
    const ang = Math.PI + (a / 32) * Math.PI;
    m.box(
      Math.round(8 + 7 * Math.cos(ang)),
      Math.round(10 + 7 * Math.sin(ang)),
      12,
      Math.round(8 + 7 * Math.cos(ang)) + 2,
      Math.round(10 + 7 * Math.sin(ang)) + 2,
      14,
      'iron',
    );
  }
  m.box(0, 9, 12, 3, 12, 14, 'iron').box(13, 9, 12, 16, 12, 14, 'iron');
  m.line(8, 30, 13, 12, 22, 10, 1, 'linen').line(
    12,
    22,
    10,
    14,
    0,
    8,
    1,
    'linen',
  );
  return m;
}

function ropeCoil() {
  const m = new Model([1, 1, 1]);
  for (let y = 0; y < 5; y++)
    for (let a = 0; a < 80; a++) {
      const ang = (a / 80) * Math.PI * 2;
      const r = 6 - (y % 2) * 0.6;
      m.box(
        Math.round(8 + r * Math.cos(ang)),
        y,
        Math.round(8 + r * Math.sin(ang)),
        Math.round(8 + r * Math.cos(ang)) + 1,
        y + 1,
        Math.round(8 + r * Math.sin(ang)) + 1,
        y % 2 ? '#c8b48a' : '#b09a70',
      );
    }
  m.line(13, 4, 9, 15, 0.5, 14, 1, '#c8b48a');
  return m.cell(0, 0, 0, 'difficult');
}

function seaChest() {
  const m = new Model([1, 1, 1]);
  m.box(1, 0, 4, 15, 8, 12, '#2c3f73').box(1, 8, 4, 15, 10, 12, '#34558a');
  for (const x of [1, 14]) m.box(x, 0, 4, x + 1, 10, 12, 'woodDark');
  m.box(1, 3, 3, 15, 4, 4, 'woodDark').box(7, 6, 3, 9, 9, 4, 'gold');
  m.box(0, 5, 7, 1, 6, 9, 'iron').box(15, 5, 7, 16, 6, 9, 'iron');
  return m.cell(0, 0, 0, 'stand');
}

function fishingNet() {
  const m = new Model([1, 2, 1]);
  m.box(0, 28, 14, 16, 29, 16, 'woodDark');
  for (let y = 4; y < 28; y++)
    for (let x = 1; x < 15; x++) {
      const sag = Math.round(Math.sin((x / 15) * Math.PI) * 3);
      if ((x + y) % 3 === 0 || (x - y + 30) % 3 === 0)
        if (y > 4 + sag) m.set(x, y, 15, '#a89a78');
    }
  for (const [x, y] of [
    [4, 8],
    [10, 12],
    [7, 18],
  ])
    m.box(x, y, 14, x + 2, y + 2, 15, '#c8a838');
  return m;
}

function bollard() {
  const m = new Model([1, 1, 1]);
  m.cyl(8, 8, 5, 0, 2, 'ash')
    .cyl(8, 8, 3.5, 2, 9, 'ash')
    .cyl(8, 8, 4.5, 9, 11, 'ash');
  m.cyl(8, 8, 4, 3, 7, '#b09a70')
    .cyl(8, 8, 3.4, 3, 7, null)
    .cyl(8, 8, 3.5, 3, 7, 'ash');
  m.line(12, 5, 8, 16, 1, 8, 1, '#b09a70');
  return m;
}

export default [
  [
    'Мачта',
    'floor',
    'Мачта с реей, подобранным парусом и марсом, 3 × 5 клеток. Препятствие.',
    mast,
  ],
  [
    'Штурвал',
    'floor',
    'Деревянный штурвал на тумбе, смотрит вперёд. Препятствие.',
    helm,
  ],
  [
    'Пушка',
    'floor',
    'Корабельная пушка на лафете с ядрами, ствол вперёд, 1 × 2 клетки. Препятствие.',
    cannon,
  ],
  [
    'Якорь',
    'floor',
    'Железный якорь с канатом, прислонённый к стене. Препятствие.',
    anchor,
  ],
  [
    'Бухта каната',
    'floor',
    'Свёрнутый кругами канат. Клетка труднопроходима.',
    ropeCoil,
  ],
  [
    'Матросский рундук',
    'floor',
    'Синий окованный сундук моряка. На него можно встать.',
    seaChest,
  ],
  [
    'Рыболовная сеть',
    'wall',
    'Сеть с поплавками на рее. Вешается на стену.',
    fishingNet,
  ],
  [
    'Швартовая тумба',
    'floor',
    'Чугунная тумба с намотанным канатом. Препятствие.',
    bollard,
  ],
];
