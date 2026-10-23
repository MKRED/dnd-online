import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module.js';
import { VoxelModelMeshController } from './mesh/voxel-model-mesh.controller.js';
import { VoxelModelMeshService } from './mesh/voxel-model-mesh.service.js';
import { VoxelModelCopyService } from './voxel-model-copy.service.js';
import { VoxelModelImageEditService } from './voxel-model-image-edit.service.js';
import { VoxelModelImagesController } from './voxel-model-images.controller.js';
import { VoxelModelImagesService } from './voxel-model-images.service.js';
import { VoxelModelUsageService } from './voxel-model-usage.service.js';
import { VoxelModelsController } from './voxel-models.controller.js';
import { VoxelModelsService } from './voxel-models.service.js';

// Справочник «Модели» (docs/plan/blocks.md, этап 8а) и загруженные файлы моделей (этап 9).
@Module({
  imports: [ApiTokensModule],
  controllers: [
    VoxelModelsController,
    VoxelModelImagesController,
    VoxelModelMeshController,
  ],
  providers: [
    VoxelModelsService,
    VoxelModelCopyService,
    VoxelModelImagesService,
    VoxelModelImageEditService,
    VoxelModelUsageService,
    VoxelModelMeshService,
  ],
})
export class VoxelModelsModule {}
