import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module.js';
import { BlockCatalogService } from './block-catalog.service.js';
import { BlockGroupImageEditService } from './block-group-image-edit.service.js';
import { BlockGroupImagesController } from './block-group-images.controller.js';
import { BlockGroupImagesService } from './block-group-images.service.js';
import { BlockGroupUsageService } from './block-group-usage.service.js';
import { BlockGroupsController } from './block-groups.controller.js';
import { BlockGroupsService } from './block-groups.service.js';

// Справочник своих блоков (docs/plan/blocks.md, этап 3). BlockCatalogService отдаёт
// картам и сценам каталог их владельца.
@Module({
  imports: [ApiTokensModule],
  controllers: [BlockGroupsController, BlockGroupImagesController],
  providers: [
    BlockGroupsService,
    BlockGroupImagesService,
    BlockGroupImageEditService,
    BlockGroupUsageService,
    BlockCatalogService,
  ],
  exports: [BlockCatalogService],
})
export class BlockGroupsModule {}
