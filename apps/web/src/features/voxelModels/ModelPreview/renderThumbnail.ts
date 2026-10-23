import {
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import type { VoxelModelFields } from 'shared';
import { cameraFor } from '../voxelCamera';
import { allCells, cellGeometry } from '../voxelGeometry';
import { gridFromFields } from '../voxelGrid';
import { buildCellMesh } from '../voxelMesh';

// Миниатюры моделей для списка (docs/plan/blocks.md, этап 8а): одна невидимая сцена на
// все карточки. Свой холст WebGL у каждой карточки упёрся бы в предел браузера (около 16
// контекстов на страницу) — поэтому картинка рисуется здесь и уходит в <img>.
let renderer: WebGLRenderer | null = null;
const cache = new Map<string, string>();

function getRenderer(): WebGLRenderer | null {
  if (renderer) return renderer;
  try {
    renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
  } catch (err: unknown) {
    // Без WebGL (старый браузер, тесты) — без миниатюр: карточка покажет заглушку.
    console.error('Model thumbnails: WebGL is unavailable', err);
    return null;
  }
  return renderer;
}

// Картинка data: URL или null, если рисовать нечем. key — запись и время её правки.
export function modelThumbnail(
  key: string,
  model: VoxelModelFields,
  size: number,
): string | null {
  const cached = cache.get(`${key}:${size}`);
  if (cached) return cached;
  const gl = getRenderer();
  if (!gl) return null;
  const grid = gridFromFields(model);
  const scene = new Scene();
  scene.add(new HemisphereLight('#ffffff', '#5a5048', 1.2));
  const sun = new DirectionalLight('#ffffff', 1.4);
  sun.position.set(60, 120, -80);
  scene.add(sun);
  const group = new Group();
  group.position.set(-grid.dims[0] / 2, 0, -grid.dims[2] / 2);
  const material = new MeshLambertMaterial({ vertexColors: true });
  for (const cell of allCells(grid.size)) {
    const data = buildCellMesh(grid, cell, grid.dims[1]);
    if (data.positions.length)
      group.add(new Mesh(cellGeometry(data), material));
  }
  scene.add(group);
  const view = cameraFor(grid.dims, true);
  const camera = new PerspectiveCamera(36, 1, 0.5, 4000);
  camera.position.set(...view.position);
  camera.lookAt(...view.target);
  gl.setPixelRatio(window.devicePixelRatio || 1);
  gl.setSize(size, size, false);
  gl.render(scene, camera);
  const url = gl.domElement.toDataURL('image/png');
  group.children.forEach((mesh) => (mesh as Mesh).geometry.dispose());
  material.dispose();
  cache.set(`${key}:${size}`, url);
  return url;
}
