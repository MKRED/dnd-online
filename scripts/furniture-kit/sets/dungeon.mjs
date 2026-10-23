// Подземелье и склеп. Оси и «вперёд» — как в models.mjs.
import { Model, rng } from '../voxels.mjs';

// Прутья решётки поперёк проёма на высоте [y0, y1).
function bars(m, y0, y1) {
  for (let x = 1; x < 16; x += 3) m.box(x, y0, 7, x + 2, y1, 9, 'iron');
  for (let y = y0 + 2; y < y1; y += 8) m.box(0, y, 7, 16, y + 2, 9, 'iron');
}

function portcullisDown() {
  const m = new Model([1, 2, 1]);
  bars(m, 0, 32);
  for (let x = 1; x < 16; x += 3) m.box(x, 0, 7, x + 2, 1, 9, 'ironLight');
  return m;
}

// Поднята в потолок: из-под свода торчат только зубья, проход свободен.
function portcullisUp() {
  const m = new Model([1, 2, 1]);
  bars(m, 26, 32);
  for (let x = 1; x < 16; x += 3) m.box(x, 25, 7, x + 2, 26, 9, 'ironLight');
  return m.cell(0, 0, 0, 'free').cell(0, 1, 0, 'free');
}

function sarcophagusBase(m) {
  m.box(1, 0, 1, 15, 2, 31, 'stoneDark');
  m.box(2, 2, 2, 14, 10, 30, 'stone');
  for (let z = 6; z < 28; z += 7) m.box(2, 4, z, 14, 8, z + 1, 'stoneDark');
}

function sarcophagusClosed() {
  const m = new Model([1, 1, 2]);
  sarcophagusBase(m);
  m.box(1, 10, 1, 15, 12, 31, 'stoneLight');
  // Каменная фигура на крышке: голова у спины, руки сложены.
  m.box(6, 12, 24, 10, 14, 28, 'stone');
  m.box(5, 12, 8, 11, 13, 23, 'stone').box(6, 13, 14, 10, 14, 18, 'stone');
  return m.cell(0, 0, 0, 'stand').cell(0, 0, 1, 'stand');
}

// Крышка сдвинута к ногам — внутри видны кости.
function sarcophagusOpen() {
  const m = new Model([1, 1, 2]);
  sarcophagusBase(m);
  m.box(3, 3, 3, 13, 10, 29, null).box(3, 2, 3, 13, 3, 29, 'stoneDark');
  m.box(6, 3, 24, 10, 6, 28, 'white').box(7, 4, 23, 9, 5, 24, 'ash');
  m.box(7, 3, 12, 9, 4, 23, 'white').box(5, 3, 18, 11, 4, 19, 'white');
  m.box(1, 10, 1, 15, 12, 17, 'stoneLight');
  return m;
}

function tombstone() {
  const m = new Model([1, 1, 1]);
  m.box(3, 0, 9, 13, 2, 15, 'stoneDark');
  m.box(4, 2, 10, 12, 12, 13, 'stone').box(5, 12, 10, 11, 14, 13, 'stone');
  m.box(7, 5, 9, 9, 11, 10, 'stoneDark').box(5, 8, 9, 11, 9, 10, 'stoneDark');
  m.box(3, 0, 2, 13, 1, 9, '#4f4a3a');
  return m.cell(0, 0, 0, 'difficult');
}

function shackles() {
  const m = new Model([1, 1, 1]);
  m.box(5, 11, 14, 11, 14, 16, 'iron');
  for (const x of [3, 11]) {
    for (let y = 6; y < 12; y += 2)
      m.box(x + 1, y, 13, x + 2, y + 1, 14, 'ironLight');
    m.box(x, 3, 11, x + 3, 6, 14, 'iron').box(x + 1, 4, 12, x + 2, 5, 13, null);
  }
  m.line(6, 11, 13, 4, 8, 13, 1, 'ironLight').line(
    10,
    11,
    13,
    12,
    8,
    13,
    1,
    'ironLight',
  );
  return m;
}

function cageFrame(m) {
  m.box(0, 0, 0, 16, 2, 16, 'iron').box(0, 28, 0, 16, 30, 16, 'iron');
  m.box(7, 30, 7, 9, 32, 9, 'iron');
  for (let a = 0; a < 16; a += 3) {
    m.box(a, 2, 15, a + 1, 28, 16, 'iron');
    m.box(0, 2, a, 1, 28, a + 1, 'iron').box(15, 2, a, 16, 28, a + 1, 'iron');
  }
}

function cageClosed() {
  const m = new Model([1, 2, 1]);
  cageFrame(m);
  for (let x = 0; x < 16; x += 3) m.box(x, 2, 0, x + 1, 28, 1, 'iron');
  m.box(6, 13, 0, 9, 16, 1, 'gold');
  return m;
}

// Дверца распахнута внутрь к левой стенке: можно войти.
function cageOpen() {
  const m = new Model([1, 2, 1]);
  cageFrame(m);
  for (let z = 1; z < 12; z += 3) m.box(1, 2, z, 2, 28, z + 1, 'iron');
  m.box(0, 2, 0, 1, 28, 1, 'iron').box(15, 2, 0, 16, 28, 1, 'iron');
  return m.cell(0, 0, 0, 'free').cell(0, 1, 0, 'free');
}

function bones() {
  const m = new Model([1, 1, 1]);
  m.box(3, 0, 3, 7, 4, 7, 'white').box(4, 1, 2, 6, 3, 3, 'ash');
  m.box(4, 0, 3, 6, 1, 4, 'ash');
  m.line(8, 0.5, 4, 14, 0.5, 9, 1, 'white').line(
    3,
    0.5,
    11,
    10,
    0.5,
    13,
    1,
    'white',
  );
  m.line(10, 0.5, 2, 12, 0.5, 13, 1, 'linen').box(9, 0, 7, 13, 1, 8, 'white');
  return m.cell(0, 0, 0, 'difficult');
}

// Паутина прижата к стене: спицы от середины и три кольца.
function cobweb() {
  const m = new Model([1, 1, 1]);
  const [cx, cy] = [8, 9];
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + 0.2;
    m.line(
      cx,
      cy,
      15,
      cx + 9 * Math.cos(ang),
      cy + 9 * Math.sin(ang),
      15,
      1,
      'white',
    );
  }
  for (const r of [2.5, 4.5, 6.5])
    for (let a = 0; a < 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      m.set(
        Math.round(cx + r * Math.cos(ang)),
        Math.round(cy + r * Math.sin(ang)),
        15,
        'linen',
      );
    }
  return m;
}

function leverPlate(m) {
  m.box(4, 3, 14, 12, 13, 16, 'stoneDark').box(7, 7, 13, 9, 9, 14, 'iron');
}

function leverUp() {
  const m = new Model([1, 1, 1]);
  leverPlate(m);
  m.line(8, 8, 13, 8, 14, 9, 1, 'woodDark').box(7, 14, 8, 9, 16, 10, 'red');
  return m;
}

function leverDown() {
  const m = new Model([1, 1, 1]);
  leverPlate(m);
  m.line(8, 8, 13, 8, 2, 9, 1, 'woodDark').box(7, 0, 8, 9, 2, 10, 'red');
  return m;
}

function pressurePlate() {
  const m = new Model([1, 1, 1]);
  m.box(2, 0, 2, 14, 1, 14, 'stoneLight').box(3, 0, 3, 13, 1, 13, 'stone');
  return m.cell(0, 0, 0, 'free');
}

function fallenColumn() {
  const m = new Model([3, 1, 1]);
  for (let x = 2; x < 30; x++) {
    for (let z = 0; z < 16; z++)
      for (let y = 0; y < 12; y++) {
        const dz = z + 0.5 - 8;
        const dy = y + 0.5 - 6;
        if (dz * dz + dy * dy <= 30) m.set(x, y, z, 'stoneLight');
      }
  }
  m.box(18, 0, 0, 19, 12, 16, null).box(0, 0, 1, 2, 14, 15, 'stone');
  m.box(32, 0, 3, 40, 4, 10, 'stoneLight').box(41, 0, 9, 45, 3, 13, 'stone');
  m.box(36, 0, 11, 39, 2, 14, 'stoneDark');
  return m
    .cell(0, 0, 0, 'difficult')
    .cell(1, 0, 0, 'difficult')
    .cell(2, 0, 0, 'difficult');
}

function brokenBarrel() {
  const m = new Model([1, 1, 1]);
  m.cyl(8, 8, 6, 0, 1, 'woodDark');
  const rand = rng(3);
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    const x = Math.round(8 + 6 * Math.cos(ang));
    const z = Math.round(8 + 6 * Math.sin(ang));
    const h = a % 5 === 0 ? 0 : 2 + Math.floor(rand() * 8);
    m.box(x, 1, z, x + 1, 1 + h, z + 1, 'wood');
  }
  m.cyl(8, 8, 6.4, 3, 4, 'iron');
  m.line(1, 0.5, 13, 6, 0.5, 15, 1, 'wood').line(
    12,
    0.5,
    1,
    15,
    0.5,
    5,
    1,
    'wood',
  );
  return m.cell(0, 0, 0, 'difficult');
}

// Воин с мечом на постаменте, смотрит вперёд.
function statue() {
  const m = new Model([1, 3, 1]);
  m.box(1, 0, 1, 15, 3, 15, 'stoneDark').box(2, 3, 2, 14, 8, 14, 'stone');
  m.box(5, 8, 6, 7, 20, 10, 'stoneLight').box(
    9,
    8,
    6,
    11,
    20,
    10,
    'stoneLight',
  );
  m.box(4, 20, 5, 12, 33, 11, 'stoneLight');
  m.box(2, 24, 6, 4, 33, 10, 'stoneLight').box(
    12,
    24,
    6,
    14,
    33,
    10,
    'stoneLight',
  );
  m.box(6, 33, 6, 10, 39, 10, 'stoneLight').box(5, 38, 5, 11, 40, 11, 'stone');
  m.box(7, 8, 3, 9, 30, 4, 'stone').box(5, 22, 3, 11, 24, 4, 'stone');
  m.box(7, 24, 3, 9, 26, 5, 'stoneLight');
  return m;
}

export default [
  [
    'Опускная решётка',
    'doorway',
    'Железная решётка в проём шириной в клетку и высотой в две. Поднятая уходит под свод, и пройти можно.',
    [
      ['Опущена', portcullisDown],
      ['Поднята', portcullisUp],
    ],
  ],
  [
    'Саркофаг',
    'floor',
    'Каменный саркофаг с фигурой на крышке, 1 × 2 клетки. На закрытый можно встать; у открытого крышка сдвинута и внутри кости.',
    [
      ['Закрыт', sarcophagusClosed],
      ['Открыт', sarcophagusOpen],
    ],
  ],
  [
    'Надгробие',
    'floor',
    'Надгробный камень с крестом над холмиком земли. Клетка труднопроходима.',
    tombstone,
  ],
  [
    'Кандалы на стене',
    'wall',
    'Две пары кандалов на цепях. Вешаются на стену.',
    shackles,
  ],
  [
    'Клетка',
    'floor',
    'Железная клетка высотой в две клетки с замком. Открытая — дверца распахнута внутрь, войти можно.',
    [
      ['Закрыта', cageClosed],
      ['Открыта', cageOpen],
    ],
  ],
  [
    'Кости и череп',
    'floor',
    'Разбросанные кости и череп. Клетка труднопроходима.',
    bones,
  ],
  ['Паутина', 'wall', 'Паутина на стене.', cobweb],
  [
    'Рычаг',
    'wall',
    'Рычаг на каменной плите. Вешается на стену.',
    [
      ['Вверх', leverUp],
      ['Вниз', leverDown],
    ],
  ],
  [
    'Нажимная плита',
    'floor',
    'Каменная плита ловушки, вровень с полом. Не мешает ходить.',
    pressurePlate,
  ],
  [
    'Обрушенная колонна',
    'floor',
    'Упавшая колонна, расколотая надвое, и обломки, 3 клетки. Клетки труднопроходимы.',
    fallenColumn,
  ],
  [
    'Разбитая бочка',
    'floor',
    'Остатки бочки: днище, обломки клёпок и обруч. Клетка труднопроходима.',
    brokenBarrel,
  ],
  [
    'Статуя воина',
    'floor',
    'Каменная статуя воина с мечом на постаменте, высотой в три клетки. Препятствие.',
    statue,
  ],
];
