// Храм и святилище. Оси и «вперёд» — как в models.mjs.
import { Model } from '../voxels.mjs';

function brazier() {
  const m = new Model([1, 1, 1]);
  m.line(3, 0, 3, 7, 8, 7, 1, 'iron')
    .line(13, 0, 3, 9, 8, 7, 1, 'iron')
    .line(8, 0, 14, 8, 8, 9, 1, 'iron');
  m.cyl(8, 8, 4.5, 8, 9, 'iron')
    .cyl(8, 8, 5.5, 9, 11, 'iron')
    .cyl(8, 8, 4.5, 10, 11, 'ember');
  m.cyl(8, 8, 3.5, 11, 13, 'flame')
    .cyl(8, 8, 2, 13, 16, 'flame')
    .cyl(8, 8, 1.6, 11, 14, 'flameCore');
  return m;
}

function font() {
  const m = new Model([1, 1, 1]);
  m.cyl(8, 8, 4, 0, 2, 'stoneDark').cyl(8, 8, 2.5, 2, 8, 'stone');
  m.cyl(8, 8, 7, 8, 12, 'stoneLight')
    .cyl(8, 8, 5.5, 10, 12, null)
    .cyl(8, 8, 5.5, 10, 11, '#6fa8dc');
  return m;
}

// Скамья со спинкой, молящиеся смотрят вперёд.
function pew() {
  const m = new Model([2, 1, 1]);
  m.box(1, 0, 3, 3, 14, 13, 'woodDark').box(29, 0, 3, 31, 14, 13, 'woodDark');
  m.box(1, 6, 3, 31, 8, 12, 'wood').box(1, 8, 11, 31, 15, 13, 'wood');
  m.box(3, 1, 2, 29, 3, 4, 'woodDark');
  return m.cell(0, 0, 0, 'difficult').cell(1, 0, 0, 'difficult');
}

// Фигура в плаще с поднятыми руками и нимбом.
function deity() {
  const m = new Model([1, 3, 1]);
  m.box(1, 0, 1, 15, 4, 15, 'stoneDark').box(2, 4, 2, 14, 6, 14, 'stone');
  for (let y = 6; y < 30; y++) {
    const r = 6 - (y - 6) * 0.12;
    m.cyl(8, 8, r, y, y + 1, 'white');
  }
  m.line(5, 26, 8, 2, 36, 7, 2, 'white').line(11, 26, 8, 14, 36, 7, 2, 'white');
  m.ball(8, 33, 8, 3, 3.5, 3, 'white');
  for (let a = 0; a < 48; a++) {
    const ang = (a / 48) * Math.PI * 2;
    m.set(
      Math.round(8 + 5.5 * Math.cos(ang)),
      Math.round(34 + 5.5 * Math.sin(ang)),
      11,
      'gold',
    );
  }
  return m;
}

function lectern() {
  const m = new Model([1, 1, 1]);
  m.box(4, 0, 5, 12, 2, 11, 'woodDark').box(7, 2, 7, 9, 10, 9, 'woodDark');
  for (let i = 0; i < 6; i++)
    m.box(3, 10 + i, 5 + i, 13, 11 + i, 7 + i, 'wood');
  for (let i = 0; i < 5; i++) {
    m.box(4, 11 + i, 5 + i, 8, 12 + i, 7 + i, 'white').box(
      8,
      11 + i,
      5 + i,
      12,
      12 + i,
      7 + i,
      'linen',
    );
  }
  m.box(7, 11, 4, 9, 13, 5, 'red');
  return m;
}

function candles() {
  const m = new Model([1, 1, 1]);
  for (const [x, z, h] of [
    [3, 3, 7],
    [7, 2, 10],
    [11, 4, 5],
    [4, 9, 4],
    [9, 9, 8],
    [12, 12, 6],
    [6, 13, 3],
  ]) {
    m.box(x, 0, z, x + 2, h, z + 2, 'wax').box(
      x,
      h,
      z,
      x + 2,
      h + 2,
      z + 2,
      'flameCore',
    );
    m.box(x, 0, z, x + 2, 1, z + 2, '#e8dcc0');
  }
  return m.cell(0, 0, 0, 'free');
}

function censer() {
  const m = new Model([1, 1, 1]);
  m.box(7, 8, 7, 9, 16, 9, 'gold');
  m.ball(8, 5, 8, 3.5, 3, 3.5, 'gold').box(6, 5, 6, 10, 6, 10, 'ember');
  m.box(7, 8, 7, 9, 9, 9, 'gold');
  m.box(5, 2, 7, 6, 3, 8, '#cfcfcf')
    .box(10, 0, 9, 11, 1, 10, '#cfcfcf')
    .box(8, 1, 5, 9, 2, 6, '#cfcfcf');
  return m;
}

// Стрельчатое окно с цветными стёклами в каменной раме.
function stainedGlass() {
  const m = new Model([1, 2, 1]);
  const colors = ['#2a4fa8', '#a82a2a', '#e0b030', '#2a8a4a', '#7a2aa8'];
  for (let y = 2; y < 30; y++) {
    const half = y < 22 ? 6 : Math.max(1, Math.round(6 - (y - 22) * 0.8));
    m.box(8 - half - 1, y, 14, 8 + half + 1, y + 1, 16, 'stone');
    for (let x = 8 - half; x < 8 + half; x++) {
      const c =
        (x - 2) % 4 === 0 || y % 6 === 0
          ? 'iron'
          : colors[(Math.floor(x / 4) + Math.floor(y / 6)) % 5];
      m.box(x, y, 14, x + 1, y + 1, 16, c);
    }
  }
  m.box(1, 1, 13, 15, 2, 16, 'stone');
  return m;
}

function offerings() {
  const m = new Model([1, 1, 1]);
  m.cyl(5, 5, 3, 0, 2, 'gold').cyl(5, 5, 2, 1, 2, 'red');
  m.cyl(11, 6, 2.5, 0, 3, 'woodLight').box(10, 3, 5, 12, 4, 7, '#e0a030');
  for (const [x, z, c] of [
    [4, 11, 'white'],
    [6, 12, '#e8b0c8'],
    [8, 11, 'white'],
    [5, 13, '#e0d040'],
  ]) {
    m.box(x, 0, z, x + 1, 3, z + 1, 'green').box(
      x - 1,
      3,
      z - 1,
      x + 2,
      4,
      z + 2,
      c,
    );
  }
  m.box(10, 0, 11, 14, 1, 14, 'linen').box(11, 1, 12, 13, 2, 13, 'gold');
  return m.cell(0, 0, 0, 'free');
}

function gong() {
  const m = new Model([1, 2, 1]);
  m.box(0, 0, 5, 3, 2, 11, 'woodDark').box(13, 0, 5, 16, 2, 11, 'woodDark');
  m.box(1, 2, 7, 3, 30, 9, '#8e1f1f').box(13, 2, 7, 15, 30, 9, '#8e1f1f');
  m.box(0, 28, 7, 16, 30, 9, '#8e1f1f')
    .box(0, 30, 7, 2, 31, 9, 'gold')
    .box(14, 30, 7, 16, 31, 9, 'gold');
  for (let y = 7; y < 25; y++)
    for (let x = 3; x < 13; x++) {
      const d = (x + 0.5 - 8) ** 2 + (y + 0.5 - 16) ** 2;
      if (d <= 25)
        m.set(x, y, 8, d < 4 ? '#e0b030' : d > 18 ? '#a07818' : 'gold');
    }
  m.box(7, 25, 8, 9, 28, 9, 'linen');
  return m;
}

export default [
  [
    'Чаша с огнём',
    'floor',
    'Железная чаша с огнём на треноге. Препятствие.',
    brazier,
  ],
  ['Купель', 'floor', 'Каменная купель со святой водой. Препятствие.', font],
  [
    'Храмовая скамья',
    'floor',
    'Скамья со спинкой на две клетки, молящиеся смотрят вперёд. Клетки труднопроходимы.',
    pew,
  ],
  [
    'Статуя божества',
    'floor',
    'Мраморная фигура в плаще с поднятыми руками и золотым нимбом, высотой в три клетки. Препятствие.',
    deity,
  ],
  [
    'Кафедра с книгой',
    'floor',
    'Наклонная кафедра с раскрытой книгой и закладкой. Препятствие.',
    lectern,
  ],
  [
    'Свечи',
    'floor',
    'Горящие свечи разной высоты на полу или на алтаре. Не мешают ходить.',
    candles,
  ],
  [
    'Курильница',
    'ceiling',
    'Золотая курильница с тлеющими углями на цепи. Вешается под потолок.',
    censer,
  ],
  [
    'Витраж',
    'wall',
    'Стрельчатое окно с цветными стёклами в каменной раме, высотой в две клетки. Вешается на стену.',
    stainedGlass,
  ],
  [
    'Подношения',
    'floor',
    'Чаши, цветы и монеты на покрове. Не мешают ходить.',
    offerings,
  ],
  ['Гонг', 'floor', 'Бронзовый гонг на красной раме. Препятствие.', gong],
];
