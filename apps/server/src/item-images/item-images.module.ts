import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module.js';
import { ItemImageEditService } from './item-image-edit.service.js';
import { ItemImagesController } from './item-images.controller.js';
import { ItemImagesService } from './item-images.service.js';

@Module({
  imports: [ApiTokensModule],
  controllers: [ItemImagesController],
  providers: [ItemImagesService, ItemImageEditService],
})
export class ItemImagesModule {}
