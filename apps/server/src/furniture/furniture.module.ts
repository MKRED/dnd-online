import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module.js';
import { FurnitureCopyService } from './furniture-copy.service.js';
import { FurnitureImageEditService } from './furniture-image-edit.service.js';
import { FurnitureImagesController } from './furniture-images.controller.js';
import { FurnitureImagesService } from './furniture-images.service.js';
import { FurnitureController } from './furniture.controller.js';
import { FurnitureService } from './furniture.service.js';

// Справочник «Обстановка» — роль поверх моделей (docs/plan/blocks.md, этап 8б).
@Module({
  imports: [ApiTokensModule],
  controllers: [FurnitureController, FurnitureImagesController],
  providers: [
    FurnitureService,
    FurnitureCopyService,
    FurnitureImagesService,
    FurnitureImageEditService,
  ],
})
export class FurnitureModule {}
