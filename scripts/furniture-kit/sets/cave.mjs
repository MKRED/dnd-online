// Пещера и шахта. Оси и «вперёд» — как в models.mjs.
import { Model, speckle } from '../voxels.mjs';

const ROCK = ['#6e6a66', '#5e5a56', '#7c7874'];

function cone(m, cx, cz, r, y0, h, up, color) {
  for (let i = 0; i < h; i++) {
    const y = up ? y0 + i : y0 - i - 1;
    m.cyl(cx, cz, Math.max(0.6, r * (1 - i / h)), y, y + 1, color);
  }
}

function stalagmite() {
  const m = new Model([1, 2, 1]);
  cone(m, 8, 8, 6.5, 0, 26, true, ROCK[0]);
  cone(m, 3.5, 11, 2.5, 0, 9, true, ROCK[1]);
  cone(m, 12, 4, 2, 0, 7, true, ROCK[1]);
  speckle(m, 71, ROCK);
  return m;
}

function stalactite() {
  const m = new Model([1, 1, 1]);
  m.cyl(8, 8, 7.5, 15, 16, ROCK[1]);
  cone(m, 8, 8, 5, 15, 14, false, ROCK[0]);
  cone(m, 3, 4, 2.5, 15, 7, false, ROCK[0]);
  cone(m, 12.5, 11, 2, 15, 9, false, ROCK[0]);
  speckle(m, 73, ROCK);
  return m;
}

function shard(m, x, z, h, lean, color) {
  for (let i = 0; i < h; i++) {
    const r = i > h - 3 ? 0.6 : 1.4;
    m.cyl(x + lean[0] * i, z + lean[1] * i, r, i, i + 1, color);
  }
}

function crystals() {
  const m = new Model([1, 1, 1]);
  m.ball(8, 0, 8, 6, 3, 6, ROCK[1]);
  shard(m, 8, 8, 14, [0, 0], '#9a6af0');
  shard(m, 5, 7, 9, [-0.25, 0], '#b48af8');
  shard(m, 11, 9, 10, [0.25, 0.1], '#8a5ae0');
  shard(m, 8, 11, 7, [0, 0.3], '#c8a8ff');
  shard(m, 9, 4, 6, [0.1, -0.3], '#b48af8');
  return m;
}

// Вагонетка на колёсах, вдоль z, с рудой.
function minecart() {
  const m = new Model([1, 1, 1]);
  m.box(3, 3, 1, 13, 11, 15, 'iron')
    .box(4, 4, 2, 12, 11, 14, null)
    .box(3, 10, 1, 13, 11, 15, 'ironLight');
  for (const z of [3, 11])
    for (const x of [2, 13]) m.box(x, 0, z, x + 1, 3, z + 3, 'ash');
  m.ball(8, 10, 8, 4, 3, 6, ROCK[0]);
  for (const [x, z] of [
    [6, 6],
    [10, 9],
    [7, 11],
  ])
    m.box(x, 11, z, x + 2, 12, z + 2, 'gold');
  speckle(m, 77, ROCK);
  return m;
}

function rails() {
  const m = new Model([1, 1, 1]);
  for (let z = 1; z < 16; z += 4) m.box(2, 0, z, 14, 1, z + 2, 'woodDark');
  m.box(3, 1, 0, 5, 2, 16, 'ironLight').box(11, 1, 0, 13, 2, 16, 'ironLight');
  return m.cell(0, 0, 0, 'free');
}

// Крепь штольни: две стойки и балка над проходом — пройти можно.
function mineSupport() {
  const m = new Model([1, 2, 1]);
  m.box(0, 0, 6, 3, 28, 10, 'wood').box(13, 0, 6, 16, 28, 10, 'wood');
  m.box(0, 28, 5, 16, 32, 11, 'woodDark');
  m.line(3, 24, 8, 6, 28, 8, 2, 'wood').line(13, 24, 8, 10, 28, 8, 2, 'wood');
  return m.cell(0, 0, 0, 'free').cell(0, 1, 0, 'free');
}

function pickaxe() {
  const m = new Model([1, 1, 1]);
  m.ball(8, 0, 8, 7, 5, 6, ROCK[0]);
  speckle(m, 79, ROCK);
  m.line(8, 3, 8, 8, 14, 8, 1, 'woodDark');
  m.line(3, 12, 8, 13, 12, 8, 1, 'iron')
    .box(3, 11, 8, 4, 12, 9, 'iron')
    .box(12, 11, 8, 13, 12, 9, 'iron');
  m.line(2, 4, 13, 7, 5, 14, 1, 'woodDark').box(1, 4, 12, 3, 6, 15, 'iron');
  return m;
}

function orePile() {
  const m = new Model([1, 1, 1]);
  m.ball(8, 0, 8, 7.5, 7, 7.5, ROCK[0]).ball(4, 0, 12, 4, 4, 3.5, ROCK[1]);
  speckle(m, 81, ROCK);
  m.repaint((x, y, z) =>
    (x * 5 + y * 11 + z * 7) % 17 === 0
      ? '#c87a3a'
      : (x * 3 + y * 7 + z * 13) % 23 === 0
        ? 'gold'
        : undefined,
  );
  return m.cell(0, 0, 0, 'difficult');
}

function glowMushrooms() {
  const m = new Model([1, 1, 1]);
  for (const [x, z, h, r] of [
    [4, 4, 6, 3],
    [11, 6, 9, 4],
    [6, 11, 4, 2.5],
    [12, 12, 3, 2],
  ]) {
    m.cyl(x, z, 1, 0, h, '#c8d8d0')
      .cyl(x, z, r, h, h + 1, '#40e0c0')
      .cyl(x, z, r - 1.2, h + 1, h + 2, '#80fff0');
  }
  return m.cell(0, 0, 0, 'free');
}

export default [
  [
    'Сталагмит',
    'floor',
    'Каменный сталагмит высотой в две клетки с маленькими рядом. Препятствие.',
    stalagmite,
  ],
  [
    'Сталактит',
    'ceiling',
    'Каменные сосульки, свисающие с потолка пещеры. Вешаются под потолок.',
    stalactite,
  ],
  [
    'Друза кристаллов',
    'floor',
    'Фиолетовые кристаллы, растущие из камня. Препятствие.',
    crystals,
  ],
  [
    'Вагонетка',
    'floor',
    'Железная вагонетка с рудой и золотыми самородками. Препятствие.',
    minecart,
  ],
  [
    'Рельсы',
    'floor',
    'Отрезок рельсов на шпалах в одну клетку. Не мешают ходить.',
    rails,
  ],
  [
    'Крепь штольни',
    'floor',
    'Деревянные стойки и балка, подпирающие свод, высотой в две клетки. Проход между стойками свободен.',
    mineSupport,
  ],
  [
    'Кирка в камне',
    'floor',
    'Кирка, воткнутая в камень, и молот рядом. Препятствие.',
    pickaxe,
  ],
  [
    'Груда руды',
    'floor',
    'Куча камня с медной и золотой рудой. Клетка труднопроходима.',
    orePile,
  ],
  [
    'Светящиеся грибы',
    'floor',
    'Бирюзовые пещерные грибы. Не мешают ходить.',
    glowMushrooms,
  ],
];
