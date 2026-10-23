// Выжженная местность. Оси и «вперёд» — как в models.mjs.
import { Model, rng, speckle } from '../voxels.mjs';

const CHAR = ['#2a2420', '#1c1816', '#3a302a'];
const EMBER = ['#c2410c', '#ff8c1a', '#e05a10'];
const ASH = ['#6a6460', '#7a7470', '#58524e'];

// Россыпь тлеющих искр по обугленным вокселям.
function embers(m, seed, share) {
  const rand = rng(seed);
  m.repaint((x, y, z, c) =>
    CHAR.includes(c) && rand() < share
      ? EMBER[Math.floor(rand() * 3)]
      : undefined,
  );
}

function burntTree() {
  const m = new Model([1, 3, 1]);
  m.cyl(8, 8, 3, 0, 40, CHAR[0]).cyl(8, 8, 4.5, 0, 3, CHAR[0]);
  m.line(8, 24, 8, 1, 34, 6, 2, CHAR[0]).line(8, 30, 8, 15, 40, 11, 2, CHAR[0]);
  m.line(8, 36, 8, 5, 46, 12, 1, CHAR[0]).line(4, 30, 7, 2, 38, 2, 1, CHAR[0]);
  speckle(m, 91, CHAR);
  embers(m, 92, 0.02);
  return m;
}

function charredStump() {
  const m = new Model([1, 1, 1]);
  m.cyl(8, 8, 6, 0, 6, CHAR[0]).cyl(8, 8, 7.5, 0, 2, CHAR[0]);
  m.box(5, 6, 6, 8, 10, 9, CHAR[0]).box(9, 6, 8, 11, 8, 11, CHAR[0]);
  speckle(m, 93, CHAR);
  embers(m, 94, 0.06);
  return m.cell(0, 0, 0, 'stand');
}

function burntLog() {
  const m = new Model([3, 1, 1]);
  for (let x = 2; x < 44; x++)
    for (let y = 0; y < 11; y++)
      for (let z = 2; z < 14; z++)
        if ((y + 0.5 - 5.5) ** 2 + (z + 0.5 - 8) ** 2 <= 30)
          m.set(x, y, z, CHAR[0]);
  m.box(30, 6, 3, 38, 11, 13, null);
  speckle(m, 95, CHAR);
  embers(m, 96, 0.05);
  return m.cell(0, 0, 0, 'stand').cell(1, 0, 0, 'stand').cell(2, 0, 0, 'stand');
}

function coals() {
  const m = new Model([1, 1, 1]);
  const rand = rng(97);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rand() * 14);
    const z = Math.floor(rand() * 14);
    const h = 1 + Math.floor(rand() * 3);
    m.box(x, 0, z, x + 2, h, z + 2, i % 3 ? CHAR[i % 3] : EMBER[i % 3]);
  }
  return m.cell(0, 0, 0, 'difficult');
}

function smolderingLog() {
  const m = new Model([1, 1, 1]);
  for (let x = 1; x < 15; x++)
    for (let y = 0; y < 7; y++)
      for (let z = 4; z < 12; z++)
        if ((y + 0.5 - 3.5) ** 2 + (z + 0.5 - 8) ** 2 <= 13)
          m.set(x, y, z, CHAR[0]);
  speckle(m, 98, CHAR);
  embers(m, 99, 0.25);
  m.box(6, 7, 7, 8, 9, 9, 'flame')
    .box(7, 9, 7, 8, 11, 8, 'flameCore')
    .box(11, 7, 8, 12, 9, 9, 'flame');
  return m.cell(0, 0, 0, 'difficult');
}

function ashPile() {
  const m = new Model([1, 1, 1]);
  m.ball(8, 0, 8, 7.5, 5, 7.5, ASH[0]).ball(4, 0, 4, 3, 2.5, 3, ASH[1]);
  speckle(m, 101, ASH);
  m.box(9, 4, 7, 11, 5, 9, CHAR[0]);
  return m.cell(0, 0, 0, 'difficult');
}

// Остов дома: угол обугленной стены и балки крыши.
function houseRuin() {
  const m = new Model([2, 2, 2]);
  m.box(0, 0, 28, 32, 18, 32, 'stoneDark').box(0, 0, 0, 4, 22, 32, 'stoneDark');
  m.box(10, 12, 28, 18, 18, 32, null).box(0, 10, 10, 4, 16, 18, null);
  for (let x = 0; x < 32; x += 3)
    m.box(x, 18 - (x % 7), 28, x + 3, 18, 32, null);
  m.box(4, 0, 4, 28, 1, 28, CHAR[2]);
  for (const [x, z] of [
    [4, 4],
    [26, 4],
    [26, 24],
  ])
    m.box(x, 1, z, x + 2, 24 - x / 4, z + 2, CHAR[0]);
  m.line(4, 26, 26, 26, 22, 4, 2, CHAR[0]).line(
    6,
    18,
    6,
    26,
    2,
    22,
    2,
    CHAR[0],
  );
  speckle(m, 103, ['stoneDark', '#4a4644', '#3a3634']);
  speckle(m, 104, CHAR);
  embers(m, 105, 0.02);
  return m;
}

function burntCart() {
  const m = new Model([2, 1, 3]);
  for (const [x, cz] of [
    [1, 24],
    [29, 38],
  ]) {
    for (let y = 0; y < 16; y++)
      for (let z = cz - 8; z < cz + 8; z++) {
        const d = (y + 0.5 - 8) ** 2 + (z + 0.5 - cz) ** 2;
        if (d <= 56 && d >= 30 && (y + z) % 5)
          m.box(x, y, z, x + 2, y + 1, z + 1, CHAR[0]);
      }
  }
  m.box(29, 0, 18, 31, 2, 30, CHAR[0]).box(1, 0, 32, 3, 3, 44, CHAR[0]);
  m.line(4, 7, 14, 28, 3, 46, 2, CHAR[0]);
  for (let x = 4; x < 28; x += 5) m.line(x, 6, 16, x + 2, 2, 44, 1, CHAR[1]);
  m.box(8, 0, 2, 10, 2, 14, CHAR[0]);
  speckle(m, 107, CHAR);
  embers(m, 108, 0.04);
  return m;
}

function burntTent() {
  const m = new Model([2, 2, 2]);
  m.box(15, 0, 1, 17, 20, 3, CHAR[0]).box(15, 0, 29, 17, 14, 31, CHAR[0]);
  m.line(16, 20, 2, 16, 13, 30, 2, CHAR[0]);
  m.line(16, 19, 4, 4, 2, 6, 1, CHAR[1]).line(16, 18, 8, 28, 2, 10, 1, CHAR[1]);
  for (const [x0, x1, y0, y1, z0, z1] of [
    [5, 13, 4, 14, 3, 12],
    [19, 27, 2, 9, 18, 28],
  ]) {
    for (let y = y0; y < y1; y++)
      m.box(
        x0 + (y - y0),
        y,
        z0,
        x1 - Math.floor((y - y0) / 2),
        y + 1,
        z1,
        '#6a5a3c',
      );
  }
  m.repaint((x, y, z, c) =>
    c === '#6a5a3c' && (x * 7 + z * 3 + y) % 5 === 0 ? CHAR[0] : undefined,
  );
  m.box(4, 0, 4, 28, 1, 28, ASH[0]);
  speckle(m, 109, ASH);
  return m;
}

function fallenArmor() {
  const m = new Model([1, 1, 1]);
  m.box(3, 0, 4, 10, 3, 12, '#3a3a40').box(4, 3, 5, 9, 4, 11, '#4a4a50');
  m.ball(12, 2, 4, 2.5, 2.5, 2.5, '#3a3a40').box(11, 2, 2, 13, 3, 3, 'ash');
  m.box(10, 0, 9, 15, 1, 15, '#5e1414').box(11, 1, 10, 14, 2, 14, '#3a3a40');
  m.line(1, 0.5, 14, 9, 0.5, 15, 1, 'ironLight');
  return m.cell(0, 0, 0, 'free');
}

function charredBones() {
  const m = new Model([1, 1, 1]);
  m.box(3, 0, 3, 7, 4, 7, '#4a4038').box(4, 1, 2, 6, 3, 3, CHAR[1]);
  m.line(8, 0.5, 4, 14, 0.5, 9, 1, '#5a5048').line(
    3,
    0.5,
    11,
    10,
    0.5,
    13,
    1,
    '#4a4038',
  );
  for (let z = 6; z < 13; z += 2) m.line(9, 0.5, z, 13, 1.5, z, 1, '#5a5048');
  return m.cell(0, 0, 0, 'difficult');
}

function obsidian() {
  const m = new Model([1, 1, 1]);
  m.ball(8, 0, 8, 7, 9, 6.5, '#1a1424').ball(4, 0, 12, 3.5, 5, 3, '#241a30');
  m.repaint((x, y, z, c) =>
    (x + y * 2 + z) % 6 === 0
      ? '#3a2c4a'
      : (x * 3 + y) % 13 === 0
        ? EMBER[0]
        : undefined,
  );
  return m;
}

function splitBoulder() {
  const m = new Model([1, 1, 1]);
  m.ball(8, 0, 8, 7.5, 11, 7, 'stone');
  m.box(7, 0, 0, 9, 16, 16, null);
  speckle(m, 111, ['stone', 'stoneDark', '#4a4644']);
  m.repaint((x, y, z, c) => (x === 6 || x === 9 ? CHAR[0] : undefined));
  return m;
}

// Воронка: чёрная впадина с обломками и дымком.
function crater() {
  const m = new Model([2, 1, 2]);
  for (let x = 0; x < 32; x++)
    for (let z = 0; z < 32; z++) {
      const d = Math.hypot(x + 0.5 - 16, z + 0.5 - 16);
      if (d < 15 && d > 9)
        m.box(
          x,
          0,
          z,
          x + 1,
          Math.round(4 - Math.abs(d - 12)),
          z + 1,
          d < 11 ? CHAR[0] : ASH[0],
        );
      else if (d <= 9) m.set(x, 0, z, CHAR[1]);
    }
  speckle(m, 113, CHAR);
  embers(m, 114, 0.05);
  for (const [x, z] of [
    [8, 20],
    [22, 10],
    [18, 24],
  ])
    m.box(x, 1, z, x + 3, 3, z + 2, 'stoneDark');
  for (const [x, y, z] of [
    [15, 3, 15],
    [16, 6, 16],
    [15, 9, 15],
    [17, 12, 16],
  ])
    m.box(x, y, z, x + 2, y + 2, z + 2, ASH[2]);
  return m
    .cell(0, 0, 0, 'difficult')
    .cell(1, 0, 0, 'difficult')
    .cell(0, 0, 1, 'difficult')
    .cell(1, 0, 1, 'difficult');
}

// Скелет дракона: череп спереди, хребет и рёбра назад.
function dragonSkeleton() {
  const m = new Model([3, 2, 4]);
  const B = '#d8d0bc';
  for (let z = 14; z < 62; z++)
    m.box(
      23,
      14 + Math.round(4 * Math.sin(z / 9)),
      z,
      25,
      16 + Math.round(4 * Math.sin(z / 9)),
      z + 1,
      B,
    );
  for (let z = 20; z < 46; z += 4) {
    const y = 14 + Math.round(4 * Math.sin(z / 9));
    for (const s of [-1, 1]) {
      m.line(24, y, z, 24 + s * 13, y - 4, z + 1, 1, B);
      m.line(24 + s * 13, y - 4, z + 1, 24 + s * 15, 0, z + 2, 1, B);
    }
  }
  m.box(17, 6, 2, 31, 14, 14, B)
    .box(19, 8, 0, 29, 12, 2, B)
    .box(18, 2, 2, 30, 6, 12, B);
  m.box(19, 9, 1, 22, 12, 4, '#3a3028').box(26, 9, 1, 29, 12, 4, '#3a3028');
  for (let x = 19; x < 30; x += 2) m.box(x, 5, 1, x + 1, 7, 2, 'white');
  m.line(19, 14, 10, 12, 24, 16, 2, B).line(29, 14, 10, 36, 24, 16, 2, B);
  for (let z = 46; z < 64; z++) m.box(23, 14, z, 25, 15, z + 1, B);
  speckle(m, 115, [B, '#c8c0aa', '#e4dcc8']);
  return m;
}

export default [
  [
    'Обгоревшее дерево',
    'floor',
    'Мёртвое обугленное дерево без листьев, высотой в три клетки. Препятствие.',
    burntTree,
  ],
  [
    'Обугленный пень',
    'floor',
    'Обгоревший пень с тлеющими искрами. На него можно встать.',
    charredStump,
  ],
  [
    'Обгоревший ствол',
    'floor',
    'Поваленный обугленный ствол на три клетки. На него можно встать.',
    burntLog,
  ],
  [
    'Тлеющие угли',
    'floor',
    'Россыпь тлеющих углей. Клетка труднопроходима.',
    coals,
  ],
  [
    'Тлеющее бревно',
    'floor',
    'Бревно, тлеющее изнутри, с язычками огня. Клетка труднопроходима.',
    smolderingLog,
  ],
  [
    'Куча пепла',
    'floor',
    'Серая куча пепла с головешкой. Клетка труднопроходима.',
    ashPile,
  ],
  [
    'Остов дома',
    'floor',
    'Угол сгоревшего дома: обрушенные стены и обугленные балки, 2 × 2 × 2 клетки. Препятствие.',
    houseRuin,
  ],
  [
    'Сгоревшая телега',
    'floor',
    'Обугленные остатки телеги с отвалившимся колесом, 2 × 3 клетки. Препятствие.',
    burntCart,
  ],
  [
    'Сгоревший шатёр',
    'floor',
    'Каркас шатра с обгоревшими лохмотьями на пепле, 2 × 2 клетки. Препятствие.',
    burntTent,
  ],
  [
    'Брошенный доспех',
    'floor',
    'Почерневшая кираса, шлем, щит и меч на земле. Не мешают ходить.',
    fallenArmor,
  ],
  [
    'Обугленные кости',
    'floor',
    'Почерневший череп и кости. Клетка труднопроходима.',
    charredBones,
  ],
  [
    'Оплавленный камень',
    'floor',
    'Глыба обсидиана, оплавленная жаром. Препятствие.',
    obsidian,
  ],
  [
    'Расколотый валун',
    'floor',
    'Валун, расколотый надвое, со следами копоти. Препятствие.',
    splitBoulder,
  ],
  [
    'Дымящаяся воронка',
    'floor',
    'Выжженная воронка с обломками и дымом, 2 × 2 клетки. Клетки труднопроходимы.',
    crater,
  ],
  [
    'Скелет дракона',
    'floor',
    'Огромный скелет дракона: череп с рогами, хребет и рёбра, 3 × 2 × 4 клетки. Препятствие.',
    dragonSkeleton,
  ],
];
