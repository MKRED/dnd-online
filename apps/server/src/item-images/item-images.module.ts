import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ItemImageEditService } from './item-image-edit.service.js';
import { ItemImagesController } from './item-images.controller.js';
import { ItemImagesService } from './item-images.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ItemImagesController],
  providers: [ItemImagesService, ItemImageEditService],
})
export class ItemImagesModule {}
