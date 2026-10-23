// Деревня, рынок и улица. Оси и «вперёд» — как в models.mjs.
import { Model, rng, speckle } from '../voxels.mjs';

// Прилавок: товар спереди, навес в красно-белую полоску.
function marketStall() {
  const m = new Model([2, 2, 1]);
  m.box(1, 0, 3, 31, 11, 13, 'wood').box(0, 11, 2, 32, 13, 14, 'woodLight');
  for (let x = 2; x < 31; x += 7) m.box(x, 1, 2, x + 5, 10, 3, 'plank');
  for (const x of [0, 30])
    for (const z of [2, 13]) m.box(x, 0, z, x + 2, 26, z + 1, 'woodDark');
  for (let z = 0; z < 16; z++) {
    const y = 26 + Math.floor((16 - z) / 4);
    for (let x = 0; x < 32; x += 4)
      m.box(x, y, z, x + 4, y + 1, z + 1, (x / 4) % 2 ? 'white' : 'red');
  }
  for (const [x, c] of [
    [4, 'red'],
    [10, '#e0a030'],
    [17, 'potion'],
    [24, '#8b4513'],
  ]) {
    m.box(x, 13, 5, x + 5, 15, 11, 'woodDark');
    for (let i = 0; i < 4; i++)
      m.box(
        x + (i % 2) * 2 + 1,
        15,
        6 + (i >> 1) * 2,
        x + (i % 2) * 2 + 2,
        16,
        7 + (i >> 1) * 2,
        c,
      );
  }
  return m;
}

function wheel(m, x, cy, cz) {
  for (let y = 0; y < 16; y++)
    for (let z = cz - 8; z < cz + 8; z++) {
      const d = (y + 0.5 - cy) ** 2 + (z + 0.5 - cz) ** 2;
      if (d <= 56 && d >= 30) m.box(x, y, z, x + 2, y + 1, z + 1, 'woodDark');
    }
  m.box(x, cy - 7, cz - 1, x + 2, cy + 7, cz + 1, 'wood').box(
    x,
    cy - 1,
    cz - 7,
    x + 2,
    cy + 1,
    cz + 7,
    'wood',
  );
  m.box(x - 1, cy - 1, cz - 1, x + 3, cy + 1, cz + 1, 'iron');
}

// Телега: оглобли вперёд, колёса по бокам.
function cart() {
  const m = new Model([2, 1, 3]);
  m.box(3, 8, 14, 29, 10, 46, 'wood');
  m.box(3, 10, 14, 5, 15, 46, 'plank').box(27, 10, 14, 29, 15, 46, 'plank');
  m.box(3, 10, 44, 29, 15, 46, 'plank').box(3, 10, 14, 29, 15, 16, 'plank');
  wheel(m, 1, 8, 24);
  wheel(m, 29, 8, 38);
  wheel(m, 29, 8, 24);
  wheel(m, 1, 8, 38);
  m.box(8, 7, 0, 10, 9, 14, 'woodDark').box(22, 7, 0, 24, 9, 14, 'woodDark');
  m.box(8, 4, 1, 24, 6, 2, 'woodDark');
  m.ball(16, 14, 30, 9, 4, 12, '#d8c27a');
  return m;
}

function lanternHead(m, x, y, z) {
  m.box(x, y, z, x + 6, y + 1, z + 6, 'iron').box(
    x + 1,
    y + 1,
    z + 1,
    x + 5,
    y + 6,
    z + 5,
    'flameCore',
  );
  for (const [dx, dz] of [
    [0, 0],
    [5, 0],
    [0, 5],
    [5, 5],
  ])
    m.box(x + dx, y + 1, z + dz, x + dx + 1, y + 6, z + dz + 1, 'iron');
  m.box(x, y + 6, z, x + 6, y + 7, z + 6, 'iron').box(
    x + 2,
    y + 7,
    z + 2,
    x + 4,
    y + 9,
    z + 4,
    'iron',
  );
}

function lampPost() {
  const m = new Model([1, 2, 1]);
  m.box(5, 0, 5, 11, 2, 11, 'iron').box(7, 2, 7, 9, 26, 9, 'iron');
  m.box(4, 26, 7, 12, 27, 9, 'iron');
  lanternHead(m, 5, 18, 5);
  m.box(7, 17, 7, 9, 18, 9, 'iron');
  return m;
}

function wallLantern() {
  const m = new Model([1, 1, 1]);
  m.box(6, 9, 14, 10, 13, 16, 'iron').line(8, 12, 14, 8, 12, 8, 1, 'iron');
  m.box(8, 10, 8, 9, 12, 9, 'iron');
  lanternHead(m, 5, 1, 5);
  return m;
}

function trough() {
  const m = new Model([2, 1, 1]);
  m.box(1, 0, 3, 31, 8, 13, 'wood').box(3, 2, 5, 29, 8, 11, null);
  m.box(3, 2, 5, 29, 6, 11, '#4a78a8');
  m.box(2, 0, 2, 5, 3, 14, 'woodDark').box(27, 0, 2, 30, 3, 14, 'woodDark');
  return m;
}

function haystack() {
  const m = new Model([1, 1, 1]);
  m.ball(8, 0, 8, 8.2, 14, 8.2, '#d8c27a');
  speckle(m, 61, ['#d8c27a', '#c8b060', '#e4d08a']);
  m.line(3, 10, 5, 10, 13, 11, 1, 'woodDark');
  return m.cell(0, 0, 0, 'stand');
}

function grainSacks() {
  const m = new Model([1, 1, 1]);
  for (const [x, y, z] of [
    [1, 0, 2],
    [8, 0, 3],
    [4, 6, 4],
  ]) {
    m.ball(x + 3.5, y + 3, z + 4.5, 3.6, 3.2, 4.6, '#c8b48a');
    m.box(x + 2, y + 6, z + 3, x + 5, y + 7, z + 6, '#a89268');
  }
  m.box(9, 0, 11, 14, 1, 15, '#e4d08a');
  return m.cell(0, 0, 0, 'stand');
}

function basket(m, x, z, fruit) {
  m.cyl(x + 3, z + 3, 3.5, 0, 4, '#b07a45').cyl(x + 3, z + 3, 2.5, 1, 4, null);
  const rand = rng(x * 3 + z);
  for (let i = 0; i < 10; i++) {
    const fx = x + 1 + Math.floor(rand() * 5);
    const fz = z + 1 + Math.floor(rand() * 5);
    m.box(fx, 3, fz, fx + 1, 5, fz + 1, fruit[i % fruit.length]);
  }
}

function baskets() {
  const m = new Model([1, 1, 1]);
  basket(m, 1, 1, ['red', '#c0302a']);
  basket(m, 9, 2, ['#e0a030', '#d08820']);
  basket(m, 4, 9, ['potion', '#4f8a34']);
  return m.cell(0, 0, 0, 'difficult');
}

function pillory() {
  const m = new Model([1, 2, 1]);
  m.box(3, 0, 3, 13, 2, 13, 'woodDark').box(7, 2, 7, 9, 22, 9, 'woodDark');
  m.box(1, 18, 6, 15, 22, 10, 'wood').box(7, 19, 5, 9, 21, 11, null);
  m.box(3, 19, 5, 4, 21, 11, null).box(12, 19, 5, 13, 21, 11, null);
  return m;
}

function shopSign() {
  const m = new Model([1, 1, 1]);
  m.box(0, 4, 14, 16, 12, 16, 'wood').box(1, 5, 13, 15, 11, 14, 'woodLight');
  m.box(4, 6, 12, 5, 10, 13, 'iron').box(3, 9, 12, 7, 10, 13, 'iron');
  m.box(10, 6, 12, 11, 10, 13, 'woodDark').box(9, 9, 12, 13, 11, 13, 'iron');
  return m;
}

function scarecrow() {
  const m = new Model([1, 2, 1]);
  m.box(7, 0, 7, 9, 28, 9, 'woodDark').box(1, 18, 7, 15, 20, 9, 'woodDark');
  m.box(4, 10, 6, 12, 20, 10, '#7a5a3a')
    .box(2, 17, 6, 5, 21, 10, '#7a5a3a')
    .box(11, 17, 6, 14, 21, 10, '#7a5a3a');
  m.box(5, 10, 5, 11, 12, 11, '#5a7a3a');
  m.ball(8, 24, 8, 3.5, 3.5, 3.5, '#d8c27a');
  m.box(7, 24, 4, 8, 25, 5, 'ash').box(9, 24, 4, 10, 25, 5, 'ash');
  m.box(3, 27, 3, 13, 28, 13, '#8b6a3a').box(5, 28, 5, 11, 31, 11, '#8b6a3a');
  for (const x of [1, 14]) m.box(x, 15, 7, x + 1, 18, 9, '#d8c27a');
  return m;
}

export default [
  [
    'Торговый прилавок',
    'floor',
    'Прилавок с товаром под полосатым навесом, 2 × 2 клетки. Препятствие.',
    marketStall,
  ],
  [
    'Телега',
    'floor',
    'Телега с сеном на четырёх колёсах, оглобли спереди, 2 × 3 клетки. Препятствие.',
    cart,
  ],
  [
    'Фонарь на столбе',
    'floor',
    'Уличный фонарь на железном столбе высотой в две клетки. Препятствие.',
    lampPost,
  ],
  [
    'Фонарь на стене',
    'wall',
    'Фонарь на кованом кронштейне. Вешается на стену.',
    wallLantern,
  ],
  [
    'Корыто',
    'floor',
    'Деревянное корыто с водой на две клетки. Препятствие.',
    trough,
  ],
  [
    'Стог сена',
    'floor',
    'Небольшой стог сена с вилами. На него можно встать.',
    haystack,
  ],
  [
    'Мешки с зерном',
    'floor',
    'Три мешка с зерном. На них можно встать.',
    grainSacks,
  ],
  [
    'Корзины с товаром',
    'floor',
    'Три корзины с яблоками, апельсинами и зеленью. Клетка труднопроходима.',
    baskets,
  ],
  [
    'Позорный столб',
    'floor',
    'Деревянные колодки на столбе. Препятствие.',
    pillory,
  ],
  [
    'Вывеска лавки',
    'wall',
    'Доска с молотом и киркой над входом в лавку. Вешается на стену.',
    shopSign,
  ],
  ['Пугало', 'floor', 'Соломенное пугало в шляпе. Препятствие.', scarecrow],
];
