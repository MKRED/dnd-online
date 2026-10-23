// Мини-язык для рисования воксельных моделей кодом: коробки и цилиндры в вокселях
// (16 на клетку), цвета по именам. Порядок и кодирование — как у сервера (shared).
import {
  bytesToBase64,
  checkVoxelModel,
  encodeVoxels,
  modelVoxelSize,
  voxelIndex,
} from '../../packages/shared/dist/index.js';

export const COLORS = {
  wood: '#8b5a2b',
  woodDark: '#5c3a1e',
  woodLight: '#b07a45',
  plank: '#9c6a3a',
  iron: '#3f4046',
  ironLight: '#74767e',
  gold: '#d4a62a',
  stone: '#8e8e8e',
  stoneDark: '#666669',
  stoneLight: '#b3b0a8',
  red: '#8e1f1f',
  redDark: '#5e1414',
  linen: '#d9ccb0',
  white: '#efeae0',
  blue: '#34558a',
  green: '#3f7a3a',
  potion: '#5fcf4a',
  flame: '#ff8c1a',
  flameCore: '#ffe36b',
  ember: '#c2410c',
  ash: '#3a3633',
  wax: '#f3ead2',
  bookBrown: '#6b3f22',
  bookGreen: '#2f5d3a',
  bookBlue: '#2c3f73',
  bookRed: '#7a2323',
};

// Предсказуемый шум: модель при повторном запуске выходит той же самой.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Пятнистый цвет: каждый воксель из списка перекрашивается в случайный цвет того же
// списка — листва и камень перестают быть сплошной заливкой.
export function speckle(m, seed, colors) {
  const hex = colors.map((c) => (c.startsWith('#') ? c : COLORS[c]));
  const rand = rng(seed);
  m.repaint((x, y, z, c) =>
    hex.includes(c) ? hex[Math.floor(rand() * hex.length)] : undefined,
  );
}

export class Model {
  constructor(size) {
    this.size = size;
    this.dims = modelVoxelSize(size);
    this.voxels = new Uint8Array(this.dims[0] * this.dims[1] * this.dims[2]);
    this.palette = [];
    this.cells = {};
  }

  color(name) {
    const hex = name.startsWith('#') ? name : COLORS[name];
    if (!hex) throw new Error(`Нет цвета ${name}`);
    let i = this.palette.indexOf(hex);
    if (i < 0) i = this.palette.push(hex) - 1;
    return i + 1;
  }

  set(x, y, z, name) {
    const [sx, sy, sz] = this.dims;
    if (x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz) return;
    this.voxels[voxelIndex(this.dims, x, y, z)] = name ? this.color(name) : 0;
  }

  // Коробка [x0, x1) × [y0, y1) × [z0, z1); null — стереть.
  box(x0, y0, z0, x1, y1, z1, name) {
    // Дробные границы округляются: воксель — целая клетка массива.
    [x0, y0, z0, x1, y1, z1] = [x0, y0, z0, x1, y1, z1].map(Math.round);
    for (let y = y0; y < y1; y++)
      for (let z = z0; z < z1; z++)
        for (let x = x0; x < x1; x++) this.set(x, y, z, name);
    return this;
  }

  // Вертикальный цилиндр с центром (cx, cz) и радиусом r в вокселях.
  cyl(cx, cz, r, y0, y1, name) {
    for (let y = y0; y < y1; y++)
      for (let z = Math.floor(cz - r); z < cz + r; z++)
        for (let x = Math.floor(cx - r); x < cx + r; x++) {
          const dx = x + 0.5 - cx;
          const dz = z + 0.5 - cz;
          if (dx * dx + dz * dz <= r * r) this.set(x, y, z, name);
        }
    return this;
  }

  // Шар (эллипсоид) с центром в вокселях и радиусами по осям.
  ball(cx, cy, cz, rx, ry, rz, name) {
    for (let y = Math.floor(cy - ry); y < cy + ry; y++)
      for (let z = Math.floor(cz - rz); z < cz + rz; z++)
        for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          const dz = (z + 0.5 - cz) / rz;
          if (dx * dx + dy * dy + dz * dz <= 1) this.set(x, y, z, name);
        }
    return this;
  }

  // Толстая прямая от точки к точке: кубики со стороной t вдоль отрезка — рычаг, ветка.
  line(x0, y0, z0, x1, y1, z1, t, name) {
    const steps = Math.ceil(
      Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)) * 2,
    );
    for (let i = 0; i <= steps; i++) {
      const k = steps ? i / steps : 0;
      const x = Math.round(x0 + (x1 - x0) * k - t / 2);
      const y = Math.round(y0 + (y1 - y0) * k - t / 2);
      const z = Math.round(z0 + (z1 - z0) * k - t / 2);
      this.box(x, y, z, x + t, y + t, z + t, name);
    }
    return this;
  }

  // Перекрасить уже закрашенные воксели: fn(x, y, z, цвет) → новое имя цвета или
  // undefined (оставить). Для пятен и неровного цвета у природных вещей.
  repaint(fn) {
    const [sx, sy, sz] = this.dims;
    for (let y = 0; y < sy; y++)
      for (let z = 0; z < sz; z++)
        for (let x = 0; x < sx; x++) {
          const v = this.voxels[voxelIndex(this.dims, x, y, z)];
          if (!v) continue;
          const next = fn(x, y, z, this.palette[v - 1]);
          if (next) this.set(x, y, z, next);
        }
    return this;
  }

  get(x, y, z) {
    const [sx, sy, sz] = this.dims;
    if (x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz) return 0;
    return this.voxels[voxelIndex(this.dims, x, y, z)];
  }

  cell(x, y, z, kind) {
    this.cells[`${x},${y},${z}`] = kind;
    return this;
  }

  fields() {
    const fields = {
      size: this.size,
      palette: this.palette,
      voxels: bytesToBase64(encodeVoxels(this.voxels)),
      cells: this.cells,
    };
    const problem = checkVoxelModel(fields);
    if (problem) throw new Error(problem);
    return fields;
  }
}
