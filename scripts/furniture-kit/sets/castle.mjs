// Замок и тронный зал. Оси и «вперёд» — как в models.mjs.
import { Model } from '../voxels.mjs';

function tapestry() {
  const m = new Model([1, 2, 1]);
  m.box(0, 29, 13, 16, 30, 15, 'woodDark')
    .box(0, 29, 13, 1, 31, 15, 'gold')
    .box(15, 29, 13, 16, 31, 15, 'gold');
  m.box(1, 3, 14, 15, 29, 15, 'bookBlue');
  m.box(1, 3, 14, 15, 4, 15, 'gold')
    .box(1, 3, 14, 2, 29, 15, 'gold')
    .box(14, 3, 14, 15, 29, 15, 'gold');
  // Дерево на гобелене: ствол, крона, олень у подножия.
  m.box(7, 6, 13, 9, 16, 14, '#6b3f22').ball(8, 20, 13.5, 5, 4.5, 0.6, 'green');
  m.box(3, 6, 13, 6, 9, 14, '#c49a6c').box(3, 9, 13, 4, 11, 14, '#c49a6c');
  for (let x = 2; x < 15; x += 3) m.box(x, 1, 14, x + 1, 3, 15, 'gold');
  return m;
}

// Внизу — вырез «ласточкин хвост».
function banner() {
  const m = new Model([1, 2, 1]);
  m.box(2, 29, 13, 14, 30, 15, 'iron');
  m.box(4, 2, 14, 12, 29, 15, 'red');
  for (let y = 2; y < 8; y++) {
    const notch = 8 - y;
    m.box(
      8 - Math.floor(notch / 2),
      y,
      14,
      8 + Math.ceil(notch / 2),
      y + 1,
      15,
      null,
    );
  }
  m.box(6, 16, 13, 10, 24, 14, 'gold').box(7, 24, 13, 9, 26, 14, 'gold');
  return m;
}

// Пустые доспехи на крестовине: шлем, кираса, поножи.
function armorStand() {
  const m = new Model([1, 2, 1]);
  m.box(3, 0, 3, 13, 2, 13, 'woodDark').box(7, 2, 7, 9, 10, 9, 'woodDark');
  m.box(5, 2, 6, 7, 13, 10, 'ironLight').box(9, 2, 6, 11, 13, 10, 'ironLight');
  m.box(4, 13, 5, 12, 24, 11, 'ironLight').box(5, 14, 4, 11, 22, 5, '#9a9ca4');
  m.box(2, 20, 6, 4, 24, 10, 'ironLight').box(
    12,
    20,
    6,
    14,
    24,
    10,
    'ironLight',
  );
  m.box(2, 13, 7, 4, 20, 9, 'ironLight').box(12, 13, 7, 14, 20, 9, 'ironLight');
  m.box(5, 24, 5, 11, 31, 11, 'ironLight').box(5, 27, 4, 11, 28, 5, 'ash');
  m.box(7, 31, 7, 9, 32, 9, 'red');
  return m;
}

function weaponRack() {
  const m = new Model([1, 1, 1]);
  m.box(1, 0, 10, 15, 2, 15, 'woodDark')
    .box(1, 2, 13, 3, 16, 15, 'woodDark')
    .box(13, 2, 13, 15, 16, 15, 'woodDark');
  m.box(1, 12, 12, 15, 13, 15, 'woodDark');
  m.box(4, 2, 12, 5, 16, 13, 'wood').box(3, 13, 12, 6, 16, 13, 'ironLight');
  m.box(7, 2, 12, 8, 16, 13, 'wood').box(7, 14, 11, 8, 16, 14, 'ironLight');
  m.box(10, 2, 12, 11, 13, 13, 'ironLight')
    .box(9, 4, 12, 12, 5, 13, 'gold')
    .box(10, 2, 12, 11, 4, 13, '#4a2c16');
  return m;
}

function heraldicShield() {
  const m = new Model([1, 1, 1]);
  for (let y = 2; y < 15; y++) {
    const half = y < 7 ? Math.round((y - 2) * 1.2) + 1 : 7;
    m.box(8 - half, y, 14, 8 + half, y + 1, 16, 'bookBlue');
    if (half > 1)
      m.box(8 - half, y, 13, 8 - half + 1, y + 1, 14, 'gold').box(
        8 + half - 1,
        y,
        13,
        8 + half,
        y + 1,
        14,
        'gold',
      );
  }
  m.box(7, 3, 13, 9, 14, 14, 'gold').box(3, 9, 13, 13, 11, 14, 'gold');
  m.line(2, 15, 12, 14, 3, 12, 1, 'ironLight').line(
    14,
    15,
    12,
    2,
    3,
    12,
    1,
    'ironLight',
  );
  return m;
}

function candelabrum() {
  const m = new Model([1, 2, 1]);
  m.cyl(8, 8, 4, 0, 2, 'gold').box(7, 2, 7, 9, 22, 9, 'gold');
  m.box(2, 22, 7, 14, 23, 9, 'gold').box(7, 22, 2, 9, 23, 14, 'gold');
  for (const [x, z] of [
    [2, 7],
    [12, 7],
    [7, 2],
    [7, 12],
    [7, 7],
  ]) {
    m.box(x, 23, z, x + 2, 24, z + 2, 'gold').box(
      x,
      24,
      z,
      x + 2,
      29,
      z + 2,
      'wax',
    );
    m.box(x, 29, z, x + 2, 31, z + 2, 'flameCore');
  }
  return m;
}

function bust() {
  const m = new Model([1, 2, 1]);
  m.box(3, 0, 3, 13, 2, 13, 'stoneDark')
    .box(4, 2, 4, 12, 16, 12, 'stoneLight')
    .box(3, 16, 3, 13, 18, 13, 'stoneDark');
  m.box(3, 18, 5, 13, 22, 11, 'white').box(6, 22, 6, 10, 24, 10, 'white');
  m.ball(8, 27, 8, 3.5, 4, 4, 'white')
    .box(6, 27, 4, 7, 28, 5, 'stone')
    .box(9, 27, 4, 10, 28, 5, 'stone');
  m.box(4, 29, 5, 12, 31, 12, '#d8d2c4');
  return m;
}

// Кровать под балдахином 2×2, изголовье у спины.
function canopyBed() {
  const m = new Model([2, 2, 2]);
  for (const [x, z] of [
    [1, 1],
    [29, 1],
    [1, 29],
    [29, 29],
  ])
    m.box(x, 0, z, x + 2, 30, z + 2, 'woodDark');
  m.box(2, 2, 2, 30, 6, 30, 'wood').box(3, 6, 3, 29, 9, 29, 'white');
  m.box(3, 9, 3, 29, 10, 20, 'red')
    .box(2, 6, 3, 3, 9, 20, 'red')
    .box(29, 6, 3, 30, 9, 20, 'red');
  m.box(6, 9, 23, 14, 11, 28, 'white').box(18, 9, 23, 26, 11, 28, 'white');
  m.box(3, 0, 29, 29, 20, 31, 'woodDark').box(6, 14, 29, 26, 18, 30, 'gold');
  m.box(0, 30, 0, 32, 32, 32, 'red').box(1, 24, 0, 31, 30, 1, 'red');
  for (const x of [0, 31])
    m.box(x, 14, 1, x + 1, 30, 4, 'red').box(x, 14, 28, x + 1, 30, 31, 'red');
  return m
    .cell(0, 0, 0, 'difficult')
    .cell(1, 0, 0, 'difficult')
    .cell(0, 0, 1, 'difficult')
    .cell(1, 0, 1, 'difficult');
}

// Подиум для трона: ступень спереди, площадка сзади.
function dais() {
  const m = new Model([3, 1, 2]);
  m.box(0, 0, 0, 48, 8, 16, 'stone').box(0, 0, 16, 48, 16, 32, 'stone');
  m.box(4, 8, 2, 44, 9, 16, 'red')
    .box(4, 16, 18, 44, 17, 32, 'red')
    .box(4, 9, 16, 44, 16, 17, 'red');
  m.box(0, 7, 0, 48, 8, 1, 'stoneLight').box(
    0,
    15,
    16,
    48,
    16,
    17,
    'stoneLight',
  );
  for (let x = 0; x < 3; x++) m.cell(x, 0, 0, 'stand').cell(x, 0, 1, 'stand');
  return m;
}

function wardrobeBody(m) {
  m.box(1, 0, 4, 15, 30, 16, 'wood')
    .box(0, 30, 3, 16, 32, 16, 'woodDark')
    .box(1, 0, 3, 15, 2, 16, 'woodDark');
}

function wardrobeClosed() {
  const m = new Model([1, 2, 1]);
  wardrobeBody(m);
  m.box(2, 3, 3, 7, 29, 4, 'woodLight').box(9, 3, 3, 14, 29, 4, 'woodLight');
  m.box(7, 3, 3, 9, 29, 4, 'woodDark');
  m.box(6, 15, 2, 7, 18, 3, 'gold').box(9, 15, 2, 10, 18, 3, 'gold');
  return m;
}

// Створки распахнуты: внутри одежда на перекладине.
function wardrobeOpen() {
  const m = new Model([1, 2, 1]);
  wardrobeBody(m);
  m.box(2, 3, 5, 14, 29, 15, null).box(2, 26, 9, 14, 27, 10, 'woodDark');
  for (const [x, c] of [
    [3, 'red'],
    [6, 'bookBlue'],
    [9, 'green'],
    [12, 'linen'],
  ])
    m.box(x, 12, 6, x + 2, 26, 13, c);
  m.box(0, 3, 0, 2, 29, 4, 'woodLight').box(14, 3, 0, 16, 29, 4, 'woodLight');
  return m;
}

export default [
  [
    'Гобелен',
    'wall',
    'Синий гобелен с деревом и оленем в золотой кайме, высотой в две клетки. Вешается на стену.',
    tapestry,
  ],
  [
    'Знамя',
    'wall',
    'Красное знамя с ласточкиным хвостом и золотым гербом. Вешается на стену.',
    banner,
  ],
  [
    'Доспехи на стойке',
    'floor',
    'Латные доспехи на деревянной крестовине, высотой в две клетки. Препятствие.',
    armorStand,
  ],
  [
    'Стойка с оружием',
    'floor',
    'Стойка с топором, копьём и мечом, ставится спиной к стене. Препятствие.',
    weaponRack,
  ],
  [
    'Щит с гербом',
    'wall',
    'Щит с золотым крестом и скрещёнными мечами. Вешается на стену.',
    heraldicShield,
  ],
  [
    'Канделябр',
    'floor',
    'Золотой напольный канделябр на пять свечей. Препятствие.',
    candelabrum,
  ],
  [
    'Бюст на постаменте',
    'floor',
    'Мраморный бюст в лавровом венке на постаменте. Препятствие.',
    bust,
  ],
  [
    'Кровать с балдахином',
    'floor',
    'Широкая кровать под красным балдахином, 2 × 2 клетки. Клетки труднопроходимы.',
    canopyBed,
  ],
  [
    'Подиум',
    'floor',
    'Каменный подиум с красной дорожкой: ступень спереди и площадка сзади, 3 × 2 клетки. На него можно встать.',
    dais,
  ],
  [
    'Шкаф',
    'floor',
    'Двустворчатый платяной шкаф. Открытый — с одеждой внутри.',
    [
      ['Закрыт', wardrobeClosed],
      ['Открыт', wardrobeOpen],
    ],
  ],
];
