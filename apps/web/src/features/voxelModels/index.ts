import { lazy } from 'react';

// Справочник «Модели» (docs/plan/blocks.md, этап 8а). Редактор и предпросмотр — на three,
// поэтому грузятся лениво: в общий бандл three не попадает.
export const VoxelEditorModal = lazy(
  () => import('./VoxelEditor/VoxelEditorModal'),
);
export const ModelPreview = lazy(() => import('./ModelPreview/ModelPreview'));
// Воксели для правил из загруженного файла (этап 9) — тоже на three, тоже лениво.
export const MeshVoxelizer = lazy(() => import('./mesh/MeshVoxelizer'));
export type { PreviewMesh } from './ModelPreview/ModelPreview';
export type { MeshVoxels } from './mesh/MeshVoxelizer';
export {
  meshVoxelsKey,
  storedMeshPath,
  type MeshSource,
} from './mesh/meshSource';
export { default as ModelThumbnail } from './ModelPreview/ModelThumbnail';
export {
  copyVoxelModel,
  patchModelMesh,
  pullVoxelModel,
  removeModelMesh,
  uploadModelMesh,
  voxelModelsApi,
  voxelModelUsage,
} from './voxelModelApi';
