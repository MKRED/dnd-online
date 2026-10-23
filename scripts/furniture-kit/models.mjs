// Модели базового набора обстановки. Оси: x — ширина, y — высота, z — глубина;
// «вперёд» — к z = 0 (север), спина — к z = 16·глубина. 16 вокселей на клетку.
import { Model } from './voxels.mjs';

const legs = (m, x0, z0, x1, z1, h, t, color) => {
  m.box(x0, 0, z0, x0 + t, h, z0 + t, color);
  m.box(x1 - t, 0, z0, x1, h, z0 + t, color);
  m.box(x0, 0, z1 - t, x0 + t, h, z1, color);
  m.box(x1 - t, 0, z1 - t, x1, h, z1, color);
};

export function table() {
  const m = new Model([1, 1, 1]);
  legs(m, 1, 1, 15, 15, 12, 2, 'woodDark');
  m.box(0, 12, 0, 16, 14, 16, 'wood');
  m.box(2, 10, 2, 14, 12, 3, 'woodDark').box(2, 10, 13, 14, 12, 14, 'woodDark');
  return m.cell(0, 0, 0, 'stand');
}

export function longTable() {
  const m = new Model([2, 1, 1]);
  legs(m, 1, 1, 31, 15, 12, 2, 'woodDark');
  m.box(0, 12, 0, 32, 14, 16, 'wood');
  for (let x = 4; x < 32; x += 8) m.box(x, 13, 0, x + 1, 14, 16, 'plank');
  m.box(3, 4, 7, 29, 6, 9, 'woodDark');
  return m.cell(0, 0, 0, 'stand').cell(1, 0, 0, 'stand');
}

// Сидящий смотрит вперёд, спинка — сзади.
export function chair() {
  const m = new Model([1, 1, 1]);
  legs(m, 3, 3, 13, 13, 7, 2, 'woodDark');
  m.box(3, 7, 3, 13, 9, 13, 'wood');
  m.box(3, 9, 11, 5, 16, 13, 'woodDark').box(11, 9, 11, 13, 16, 13, 'woodDark');
  m.box(5, 11, 11, 11, 15, 12, 'wood');
  return m.cell(0, 0, 0, 'difficult');
}

export function bench() {
  const m = new Model([2, 1, 1]);
  m.box(2, 0, 4, 4, 6, 12, 'woodDark').box(28, 0, 4, 30, 6, 12, 'woodDark');
  m.box(4, 2, 7, 28, 3, 9, 'woodDark');
  m.box(0, 6, 4, 32, 8, 12, 'wood');
  return m.cell(0, 0, 0, 'stand').cell(1, 0, 0, 'stand');
}

// Изголовье у спины.
export function bed() {
  const m = new Model([1, 1, 2]);
  legs(m, 1, 1, 15, 31, 3, 2, 'woodDark');
  m.box(1, 3, 1, 15, 6, 31, 'wood');
  m.box(2, 6, 2, 14, 9, 30, 'linen');
  m.box(3, 9, 24, 13, 11, 29, 'white');
  m.box(2, 9, 2, 14, 10, 21, 'blue').box(1, 6, 2, 2, 9, 21, 'blue');
  m.box(14, 6, 2, 15, 9, 21, 'blue');
  m.box(1, 0, 30, 15, 14, 32, 'woodDark').box(1, 0, 0, 15, 8, 2, 'woodDark');
  return m.cell(0, 0, 0, 'difficult').cell(0, 0, 1, 'difficult');
}

function chestBody(m) {
  m.box(2, 0, 4, 14, 9, 12, 'wood');
  for (const x of [3, 12]) m.box(x, 0, 4, x + 1, 9, 12, 'iron');
  m.box(2, 0, 4, 14, 1, 12, 'woodDark');
}

export function chestClosed() {
  const m = new Model([1, 1, 1]);
  chestBody(m);
  m.box(2, 9, 4, 14, 11, 12, 'woodLight').box(
    3,
    11,
    5,
    13,
    12,
    11,
    'woodLight',
  );
  for (const x of [3, 12]) m.box(x, 9, 4, x + 1, 12, 12, 'iron');
  m.box(7, 7, 3, 9, 10, 4, 'gold');
  return m.cell(0, 0, 0, 'stand');
}

// Крышка откинута назад и стоит у спины.
export function chestOpen() {
  const m = new Model([1, 1, 1]);
  chestBody(m);
  m.box(3, 1, 5, 13, 9, 11, null).box(3, 1, 5, 13, 5, 11, 'gold');
  m.box(4, 5, 6, 7, 6, 8, 'gold').box(9, 5, 7, 12, 6, 10, 'gold');
  m.box(2, 9, 12, 14, 16, 14, 'woodLight');
  for (const x of [3, 12]) m.box(x, 9, 12, x + 1, 16, 14, 'iron');
  return m;
}

export function barrel() {
  const m = new Model([1, 1, 1]);
  m.cyl(8, 8, 5.5, 0, 2, 'wood').cyl(8, 8, 6.5, 2, 14, 'wood');
  m.cyl(8, 8, 5.5, 14, 15, 'wood');
  for (const y of [2, 7, 12]) m.cyl(8, 8, 6.6, y, y + 1, 'iron');
  m.cyl(8, 8, 4.8, 15, 16, 'woodDark');
  return m;
}

export function crate() {
  const m = new Model([1, 1, 1]);
  m.box(1, 0, 1, 15, 14, 15, 'woodLight');
  for (const [x, z] of [
    [1, 1],
    [13, 1],
    [1, 13],
    [13, 13],
  ])
    m.box(x, 0, z, x + 2, 14, z + 2, 'woodDark');
  for (const y of [0, 12]) {
    m.box(1, y, 1, 15, y + 2, 2, 'woodDark').box(
      1,
      y,
      14,
      15,
      y + 2,
      15,
      'woodDark',
    );
    m.box(1, y, 1, 2, y + 2, 15, 'woodDark').box(
      14,
      y,
      1,
      15,
      y + 2,
      15,
      'woodDark',
    );
  }
  return m.cell(0, 0, 0, 'stand');
}

const BOOKS = ['bookBrown', 'bookGreen', 'bookBlue', 'bookRed'];

// Спина — к стене.
export function bookcase() {
  const m = new Model([1, 2, 1]);
  m.box(0, 0, 13, 16, 32, 16, 'woodDark');
  m.box(0, 0, 4, 2, 32, 16, 'wood').box(14, 0, 4, 16, 32, 16, 'wood');
  for (const y of [0, 10, 20, 30]) m.box(0, y, 4, 16, y + 2, 16, 'wood');
  for (const y of [2, 12, 22]) {
    let x = 2;
    let i = y;
    while (x < 14) {
      const w = 1 + (i % 2);
      const h = 6 + ((i * 7) % 3);
      m.box(x, y, 6, Math.min(x + w, 14), y + h, 13, BOOKS[i % 4]);
      x += w;
      i += 3;
    }
  }
  return m;
}

// Висит на стене: кронштейн прижат к спине.
export function torch() {
  const m = new Model([1, 1, 1]);
  m.box(6, 5, 14, 10, 8, 16, 'iron').box(7, 6, 11, 9, 7, 14, 'iron');
  m.box(7, 3, 11, 9, 11, 13, 'woodDark');
  m.box(6, 11, 10, 10, 12, 14, 'iron');
  m.box(6, 12, 10, 10, 14, 14, 'flame').box(7, 14, 11, 9, 16, 13, 'flame');
  m.box(7, 12, 11, 9, 14, 13, 'flameCore');
  return m;
}

export function column() {
  const m = new Model([1, 3, 1]);
  m.box(0, 0, 0, 16, 2, 16, 'stoneDark').box(1, 2, 1, 15, 4, 15, 'stone');
  m.cyl(8, 8, 5.5, 4, 44, 'stoneLight');
  for (let a = 0; a < 8; a++) {
    const x = Math.round(8 + 5.2 * Math.cos((a * Math.PI) / 4) - 0.5);
    const z = Math.round(8 + 5.2 * Math.sin((a * Math.PI) / 4) - 0.5);
    m.box(x, 6, z, x + 1, 42, z + 1, 'stone');
  }
  m.box(1, 44, 1, 15, 46, 15, 'stone').box(0, 46, 0, 16, 48, 16, 'stoneDark');
  return m;
}

// Створка двери 1×2: доски, две петли и ручка. along — x (поперёк проёма) или z.
function doorLeaf(m, along, x0, z0, len, height, thick, hingeAtStart) {
  const put = (a0, y0, a1, y1, t0, t1, color) =>
    along === 'x'
      ? m.box(x0 + a0, y0, z0 + t0, x0 + a1, y1, z0 + t1, color)
      : m.box(x0 + t0, y0, z0 + a0, x0 + t1, y1, z0 + a1, color);
  for (let a = 0; a < len; a += 4)
    put(
      a,
      0,
      Math.min(a + 4, len),
      height,
      0,
      thick,
      (a / 4) % 2 ? 'plank' : 'wood',
    );
  for (const y of [5, height - 7]) put(0, y, len, y + 2, 0, thick, 'woodDark');
  const hinge = hingeAtStart ? 0 : len - 5;
  for (const y of [4, height - 8])
    put(hinge, y, hinge + 5, y + 4, -1, thick + 1, 'iron');
  const knob = hingeAtStart ? len - 4 : 2;
  put(knob, 14, knob + 2, 17, -2, thick + 2, 'ironLight');
}

export function doorClosed() {
  const m = new Model([1, 2, 1]);
  doorLeaf(m, 'x', 0, 7, 16, 32, 2, true);
  return m;
}

// Открыта внутрь проёма: створка прижата к левой грани, клетки свободны.
export function doorOpen() {
  const m = new Model([1, 2, 1]);
  doorLeaf(m, 'z', 0, 0, 16, 32, 2, false);
  return m.cell(0, 0, 0, 'free').cell(0, 1, 0, 'free');
}

function gateLeaf(m, along, x0, z0, len, hingeAtStart) {
  const put = (a0, y0, a1, y1, t0, t1, color) =>
    along === 'x'
      ? m.box(x0 + a0, y0, z0 + t0, x0 + a1, y1, z0 + t1, color)
      : m.box(x0 + t0, y0, z0 + a0, x0 + t1, y1, z0 + a1, color);
  for (let a = 0; a < len; a += 4)
    put(a, 0, a + 4, 48, 0, 2, (a / 4) % 2 ? 'woodDark' : 'wood');
  for (const y of [4, 22, 40]) put(0, y, len, y + 3, -1, 3, 'iron');
  for (const y of [4, 22, 40])
    for (let a = 2; a < len; a += 4)
      put(a, y + 1, a + 1, y + 2, -2, 4, 'ironLight');
  const ring = hingeAtStart ? len - 4 : 2;
  put(ring, 20, ring + 2, 24, -2, 4, 'ironLight');
}

export function gateClosed() {
  const m = new Model([2, 3, 1]);
  gateLeaf(m, 'x', 0, 7, 16, true);
  gateLeaf(m, 'x', 16, 7, 16, false);
  return m;
}

export function gateOpen() {
  const m = new Model([2, 3, 1]);
  gateLeaf(m, 'z', 0, 0, 16, false);
  gateLeaf(m, 'z', 30, 0, 16, false);
  for (let x = 0; x < 2; x++)
    for (let y = 0; y < 3; y++) m.cell(x, y, 0, 'free');
  return m;
}

// Висит под потолком: цепь доходит до верхней грани.
export function chandelier() {
  const m = new Model([1, 1, 1]);
  m.box(7, 9, 7, 9, 16, 9, 'iron');
  m.cyl(8, 8, 7, 5, 6, 'iron').cyl(8, 8, 5.5, 5, 6, null);
  m.box(5, 5, 7, 11, 6, 9, 'iron').box(7, 5, 5, 9, 6, 11, 'iron');
  m.box(7, 6, 7, 9, 9, 9, 'iron');
  for (const [x, z] of [
    [1, 7],
    [13, 7],
    [7, 1],
    [7, 13],
  ]) {
    m.box(x, 6, z, x + 2, 9, z + 2, 'wax');
    m.box(x, 9, z, x + 2, 10, z + 2, 'flameCore');
  }
  return m;
}

export function rug() {
  const m = new Model([2, 1, 3]);
  m.box(1, 0, 1, 31, 1, 47, 'red');
  m.box(1, 0, 1, 31, 1, 3, 'gold').box(1, 0, 45, 31, 1, 47, 'gold');
  m.box(1, 0, 1, 3, 1, 47, 'gold').box(29, 0, 1, 31, 1, 47, 'gold');
  m.box(6, 0, 6, 26, 1, 42, 'redDark').box(8, 0, 8, 24, 1, 40, 'red');
  m.box(14, 0, 16, 18, 1, 32, 'gold').box(10, 0, 22, 22, 1, 26, 'gold');
  for (let x = 0; x < 2; x++)
    for (let z = 0; z < 3; z++) m.cell(x, 0, z, 'free');
  return m;
}

export function campfire() {
  const m = new Model([1, 1, 1]);
  for (let a = 0; a < 10; a++) {
    const x = Math.round(8 + 6 * Math.cos((a * Math.PI) / 5) - 1);
    const z = Math.round(8 + 6 * Math.sin((a * Math.PI) / 5) - 1);
    m.box(x, 0, z, x + 2, 2, z + 2, a % 2 ? 'stone' : 'stoneDark');
  }
  m.box(5, 0, 5, 11, 1, 11, 'ash');
  m.box(4, 1, 7, 12, 3, 9, 'woodDark').box(7, 2, 4, 9, 4, 12, 'wood');
  m.box(6, 3, 6, 10, 5, 10, 'ember');
  m.box(6, 5, 6, 10, 8, 10, 'flame').box(7, 8, 7, 9, 11, 9, 'flame');
  m.box(7, 4, 7, 9, 7, 9, 'flameCore');
  return m.cell(0, 0, 0, 'difficult');
}

// Ставится к стене: топка открыта вперёд.
export function fireplace() {
  const m = new Model([2, 2, 1]);
  m.box(0, 0, 4, 32, 26, 16, 'stone');
  m.box(8, 0, 4, 24, 14, 13, null);
  m.box(8, 0, 4, 24, 1, 13, 'stoneDark');
  m.box(10, 1, 6, 22, 3, 9, 'woodDark').box(12, 3, 6, 20, 5, 9, 'ember');
  m.box(12, 5, 6, 20, 8, 9, 'flame').box(14, 8, 6, 18, 11, 8, 'flame');
  m.box(14, 5, 6, 18, 7, 8, 'flameCore');
  m.box(0, 26, 2, 32, 28, 16, 'stoneDark');
  m.box(10, 28, 8, 22, 32, 16, 'stone');
  for (let x = 0; x < 32; x += 6) m.box(x, 13, 4, x + 1, 14, 5, 'stoneDark');
  return m;
}

export function throne() {
  const m = new Model([1, 2, 1]);
  m.box(1, 0, 1, 15, 2, 15, 'gold');
  m.box(2, 2, 2, 14, 8, 14, 'woodDark');
  m.box(3, 8, 2, 13, 10, 13, 'red');
  m.box(1, 8, 2, 3, 13, 14, 'gold').box(13, 8, 2, 15, 13, 14, 'gold');
  m.box(2, 8, 13, 14, 29, 15, 'woodDark').box(4, 10, 12, 12, 26, 13, 'red');
  m.box(1, 29, 13, 15, 30, 15, 'gold');
  for (const x of [2, 7, 12]) m.box(x, 30, 13, x + 2, 32, 15, 'gold');
  return m.cell(0, 0, 0, 'difficult');
}

export function cauldron() {
  const m = new Model([1, 1, 1]);
  for (const [x, z] of [
    [3, 3],
    [11, 3],
    [7, 12],
  ])
    m.box(x, 0, z, x + 2, 3, z + 2, 'iron');
  m.cyl(8, 8, 5, 2, 4, 'iron').cyl(8, 8, 6.5, 4, 10, 'iron');
  m.cyl(8, 8, 6, 10, 12, 'iron').cyl(8, 8, 7, 12, 13, 'ironLight');
  m.cyl(8, 8, 5.5, 5, 13, null).cyl(8, 8, 5.5, 5, 11, 'potion');
  m.box(6, 11, 6, 8, 12, 8, 'potion').box(9, 11, 9, 10, 12, 10, 'potion');
  return m;
}

// Полка на стене с бутылками и свечой.
export function wallShelf() {
  const m = new Model([1, 1, 1]);
  m.box(0, 6, 9, 16, 8, 16, 'wood');
  m.box(1, 2, 14, 3, 6, 16, 'woodDark').box(13, 2, 14, 15, 6, 16, 'woodDark');
  m.box(2, 8, 11, 4, 13, 13, 'bookGreen').box(2, 13, 11, 4, 14, 13, 'woodDark');
  m.box(6, 8, 11, 8, 12, 13, 'bookBlue').box(6, 12, 11, 8, 13, 13, 'woodDark');
  m.box(9, 8, 10, 13, 11, 14, 'bookBrown');
  m.box(14, 8, 12, 15, 11, 13, 'wax').box(14, 11, 12, 15, 12, 13, 'flameCore');
  return m;
}

export function altar() {
  const m = new Model([2, 1, 1]);
  m.box(0, 0, 1, 32, 2, 15, 'stoneDark');
  m.box(2, 2, 3, 30, 10, 13, 'stone');
  m.box(1, 10, 2, 31, 12, 14, 'stoneLight');
  m.box(4, 3, 2, 28, 9, 3, 'stoneDark').box(14, 4, 1, 18, 8, 2, 'gold');
  m.box(2, 12, 4, 30, 13, 12, 'red');
  return m.cell(0, 0, 0, 'stand').cell(1, 0, 0, 'stand');
}
