// Таверна и постоялый двор. Оси и «вперёд» — как в models.mjs.
import { Model } from '../voxels.mjs';

// Стойка: посетители спереди, трактирщик за спиной.
function barCounter() {
  const m = new Model([3, 1, 1]);
  m.box(0, 0, 2, 48, 12, 14, 'woodDark');
  for (let x = 0; x < 48; x += 6) m.box(x, 1, 1, x + 4, 11, 2, 'wood');
  m.box(0, 12, 0, 48, 14, 15, 'wood').box(0, 0, 1, 48, 1, 2, 'woodDark');
  m.box(6, 14, 4, 8, 17, 6, 'linen').box(30, 14, 6, 33, 16, 9, 'gold');
  return m.cell(0, 0, 0, 'stand').cell(1, 0, 0, 'stand').cell(2, 0, 0, 'stand');
}

function stool() {
  const m = new Model([1, 1, 1]);
  m.cyl(8, 8, 4.5, 8, 10, 'wood');
  for (const [x, z] of [
    [4, 4],
    [11, 4],
    [4, 11],
    [11, 11],
  ])
    m.box(x, 0, z, x + 1, 8, z + 1, 'woodDark');
  m.box(5, 3, 4, 11, 4, 5, 'woodDark').box(5, 3, 11, 11, 4, 12, 'woodDark');
  return m.cell(0, 0, 0, 'difficult');
}

// Бочка на боку вдоль z со дном к x: тёмное дерево, обручи, кран спереди.
function lyingBarrel(m, x0, y0, z0, len, r, wood, hoop) {
  const cy = y0 + r;
  const cx = x0 + r;
  for (let z = z0; z < z0 + len; z++) {
    const k = (z - z0 + 0.5) / len - 0.5;
    const rr = r - 1.2 * k * k * 4;
    for (let y = y0; y < y0 + 2 * r; y++)
      for (let x = x0; x < x0 + 2 * r; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= rr * rr) m.set(x, y, z, wood);
      }
  }
  for (const z of [z0 + 1, z0 + len - 2])
    for (let y = y0; y < y0 + 2 * r; y++)
      for (let x = x0; x < x0 + 2 * r; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const d = dx * dx + dy * dy;
        if (d <= r * r && d >= (r - 1.2) * (r - 1.2)) m.set(x, y, z, hoop);
      }
}

function rumBarrel() {
  const m = new Model([1, 1, 1]);
  m.box(2, 0, 2, 4, 4, 14, 'woodDark').box(12, 0, 2, 14, 4, 14, 'woodDark');
  m.box(2, 0, 3, 14, 2, 5, 'woodDark').box(2, 0, 11, 14, 2, 13, 'woodDark');
  lyingBarrel(m, 2, 2, 1, 14, 6, '#4a2c16', 'iron');
  m.box(6, 9, 0, 10, 12, 1, 'gold').box(7, 4, 0, 9, 6, 1, 'ironLight');
  m.box(7, 3, 0, 9, 4, 1, 'iron');
  return m;
}

// Три бочки рома: две внизу, одна сверху между ними.
function rumStack() {
  const m = new Model([2, 2, 2]);
  m.box(1, 0, 2, 31, 2, 4, 'woodDark').box(1, 0, 28, 31, 2, 30, 'woodDark');
  lyingBarrel(m, 1, 2, 1, 30, 7, '#4a2c16', 'iron');
  lyingBarrel(m, 17, 2, 1, 30, 7, '#4a2c16', 'iron');
  lyingBarrel(m, 9, 15, 1, 30, 7, '#5a361b', 'iron');
  for (const [x, y] of [
    [6, 8],
    [22, 8],
    [14, 21],
  ])
    m.box(x, y, 0, x + 4, y + 3, 1, 'gold');
  return m;
}

// Два бочонка на козлах с кранами — за стойкой.
function kegRack() {
  const m = new Model([2, 1, 1]);
  m.box(1, 0, 4, 31, 6, 14, 'woodDark').box(3, 0, 3, 29, 1, 4, 'woodDark');
  lyingBarrel(m, 3, 6, 3, 11, 5, 'wood', 'iron');
  lyingBarrel(m, 19, 6, 3, 11, 5, 'wood', 'iron');
  for (const x of [7, 23])
    m.box(x, 8, 2, x + 2, 10, 3, 'ironLight').box(x, 7, 2, x + 2, 8, 3, 'iron');
  return m;
}

// Кружки и тарелка — ставятся на стол.
function tableware() {
  const m = new Model([1, 1, 1]);
  m.cyl(10, 9, 3.5, 0, 1, 'linen').box(9, 1, 8, 12, 2, 10, '#a0522d');
  for (const [x, z] of [
    [3, 3],
    [5, 11],
  ]) {
    m.cyl(x + 1.5, z + 1.5, 1.6, 0, 4, 'woodLight').box(
      x,
      4,
      z,
      x + 3,
      5,
      z + 3,
      'white',
    );
    m.box(x + 3, 1, z + 1, x + 4, 3, z + 2, 'woodDark');
  }
  m.box(12, 0, 2, 14, 5, 4, 'bookGreen').box(12, 5, 2, 14, 7, 4, 'woodDark');
  return m.cell(0, 0, 0, 'free');
}

// Вывеска на кованом кронштейне: висит поперёк стены.
function tavernSign() {
  const m = new Model([1, 1, 1]);
  m.box(7, 13, 13, 9, 16, 16, 'iron').line(8, 14, 13, 8, 14, 0, 1, 'iron');
  m.line(8, 14, 13, 8, 10, 15, 1, 'iron');
  m.box(8, 12, 3, 9, 14, 4, 'iron').box(8, 12, 10, 9, 14, 11, 'iron');
  m.box(7, 2, 1, 10, 12, 13, 'wood').box(7, 3, 2, 10, 11, 12, 'woodLight');
  m.box(7, 5, 5, 10, 9, 9, 'gold').box(7, 4, 6, 10, 5, 8, 'gold');
  return m;
}

function bottleShelf() {
  const m = new Model([1, 1, 1]);
  const colors = ['bookGreen', '#6b2b2b', 'potion', '#4a2c16', 'bookBlue'];
  for (const y of [1, 9]) {
    m.box(0, y, 10, 16, y + 1, 16, 'wood');
    for (let i = 0; i < 5; i++) {
      const x = 1 + i * 3;
      m.box(x, y + 1, 12, x + 2, y + 5, 14, colors[(i + y) % 5]);
      m.box(x, y + 5, 12, x + 1, y + 6, 13, 'woodDark');
    }
  }
  m.box(0, 0, 15, 1, 16, 16, 'woodDark').box(15, 0, 15, 16, 16, 16, 'woodDark');
  return m;
}

function spit() {
  const m = new Model([1, 1, 1]);
  m.box(4, 0, 4, 12, 1, 12, 'ash');
  m.box(5, 1, 6, 11, 3, 10, 'ember').box(6, 3, 6, 10, 6, 10, 'flame');
  m.box(7, 3, 7, 9, 5, 9, 'flameCore');
  for (const x of [1, 14]) {
    m.box(x, 0, 7, x + 1, 11, 9, 'woodDark');
    m.box(x - 1, 11, 7, x, 13, 9, 'woodDark').box(
      x + 1,
      11,
      7,
      x + 2,
      13,
      9,
      'woodDark',
    );
  }
  m.box(0, 11, 8, 16, 12, 9, 'iron').box(15, 9, 8, 16, 12, 9, 'iron');
  m.ball(8, 11.5, 8.5, 4, 2.5, 2.5, '#8b4513').box(
    5,
    13,
    7,
    11,
    14,
    10,
    '#a0522d',
  );
  return m.cell(0, 0, 0, 'difficult');
}

function deerHead() {
  const m = new Model([1, 1, 1]);
  m.box(4, 3, 14, 12, 12, 16, 'woodDark');
  m.box(6, 5, 10, 10, 11, 14, '#8b5a3c').box(6, 4, 6, 10, 8, 10, '#8b5a3c');
  m.box(7, 4, 5, 9, 6, 6, 'ash')
    .box(6, 7, 7, 7, 8, 8, 'ash')
    .box(9, 7, 7, 10, 8, 8, 'ash');
  m.box(5, 10, 10, 6, 12, 12, '#8b5a3c').box(10, 10, 10, 11, 12, 12, '#8b5a3c');
  for (const s of [-1, 1]) {
    const x = 8 + s * 2;
    m.line(x, 11, 11, 8 + s * 6, 15, 11, 1, 'linen');
    m.line(8 + s * 4, 13, 11, 8 + s * 4, 16, 11, 1, 'linen');
    m.line(8 + s * 5, 14, 11, 8 + s * 7, 14, 9, 1, 'linen');
  }
  return m;
}

function noticeBoard() {
  const m = new Model([1, 1, 1]);
  m.box(1, 3, 14, 15, 14, 16, 'woodDark').box(2, 4, 14, 14, 13, 15, '#b08a5a');
  for (const [x, y, w, h, c] of [
    [3, 8, 4, 4, 'white'],
    [8, 9, 5, 3, 'linen'],
    [4, 5, 3, 2, 'linen'],
    [9, 5, 4, 3, 'white'],
  ]) {
    m.box(x, y, 13, x + w, y + h, 14, c);
    m.box(x + 1, y + h - 1, 12, x + 2, y + h, 13, 'red');
  }
  return m;
}

export default [
  [
    'Барная стойка',
    'floor',
    'Стойка трактирщика на три клетки, посетители спереди. На неё можно встать.',
    barCounter,
  ],
  [
    'Табурет',
    'floor',
    'Круглый табурет на четырёх ножках. Клетка труднопроходима.',
    stool,
  ],
  [
    'Бочка рома',
    'floor',
    'Тёмная бочка рома на подставке, с краном и клеймом. Препятствие.',
    rumBarrel,
  ],
  [
    'Пирамида бочек рома',
    'floor',
    'Три бочки рома на подставках, 2 × 2 × 2 клетки. Препятствие.',
    rumStack,
  ],
  [
    'Бочонки с кранами',
    'floor',
    'Два бочонка на козлах с кранами, на две клетки. Препятствие.',
    kegRack,
  ],
  [
    'Кружки и тарелка',
    'floor',
    'Две кружки, тарелка с хлебом и бутылка — ставятся на стол. Не мешают ходить.',
    tableware,
  ],
  [
    'Вывеска таверны',
    'wall',
    'Деревянная вывеска с кружкой на кованом кронштейне. Вешается на стену.',
    tavernSign,
  ],
  [
    'Полка с бутылками',
    'wall',
    'Две полки с разноцветными бутылками. Вешаются на стену за стойкой.',
    bottleShelf,
  ],
  [
    'Вертел над огнём',
    'floor',
    'Окорок на вертеле над углями. Клетка труднопроходима.',
    spit,
  ],
  [
    'Голова оленя',
    'wall',
    'Охотничий трофей на деревянном щите. Вешается на стену.',
    deerHead,
  ],
  [
    'Доска объявлений',
    'wall',
    'Доска с приколотыми заказами и объявлениями. Вешается на стену.',
    noticeBoard,
  ],
];
