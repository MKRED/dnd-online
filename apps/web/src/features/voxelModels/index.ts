import { lazy } from 'react';

// Справочник «Модели» (docs/plan/blocks.md, этап 8а). Редактор и предпросмотр — на three,
// поэтому грузятся лениво: в общий бандл three не попадает.
export const VoxelEditorModal = lazy(
  () => import('./VoxelEditor/VoxelEditorModal'),
);
export const ModelPreview = lazy(() => import('./ModelPreview/ModelPreview'));
export { default as ModelThumbnail } from './ModelPreview/ModelThumbnail';
export {
  copyVoxelModel,
  pullVoxelModel,
  voxelModelsApi,
  voxelModelUsage,
} from './voxelModelApi';
