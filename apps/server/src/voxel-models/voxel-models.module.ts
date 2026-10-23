import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module.js';
import { VoxelModelCopyService } from './voxel-model-copy.service.js';
import { VoxelModelImageEditService } from './voxel-model-image-edit.service.js';
import { VoxelModelImagesController } from './voxel-model-images.controller.js';
import { VoxelModelImagesService } from './voxel-model-images.service.js';
import { VoxelModelUsageService } from './voxel-model-usage.service.js';
import { VoxelModelsController } from './voxel-models.controller.js';
import { VoxelModelsService } from './voxel-models.service.js';

// Справочник «Модели» (docs/plan/blocks.md, этап 8а).
@Module({
  imports: [ApiTokensModule],
  controllers: [VoxelModelsController, VoxelModelImagesController],
  providers: [
    VoxelModelsService,
    VoxelModelCopyService,
    VoxelModelImagesService,
    VoxelModelImageEditService,
    VoxelModelUsageService,
  ],
})
export class VoxelModelsModule {}
