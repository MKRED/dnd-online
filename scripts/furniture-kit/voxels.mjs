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

export class Model {
  constructor(size) {
    this.size = size;
    this.dims = modelVoxelSize(size);
    this.voxels = new Uint8Array(this.dims[0] * this.dims[1] * this.dims[2]);
    this.palette = [];
    this.cells = {};
  }

  color(name) {
    const hex = COLORS[name];
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
