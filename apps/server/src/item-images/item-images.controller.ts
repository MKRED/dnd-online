import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CatalogImagesController } from '../catalog/images/catalog-images.controller.js';
import { ItemImageEditService } from './item-image-edit.service.js';
import { ItemImagesService } from './item-images.service.js';

// Маршруты — общие для каталогов (CatalogImagesController).
@Controller('items/:ownerId/image')
@UseGuards(AuthGuard)
export class ItemImagesController extends CatalogImagesController {
  constructor(
    filesService: ItemImagesService,
    editService: ItemImageEditService,
  ) {
    super(filesService, editService);
  }
}
