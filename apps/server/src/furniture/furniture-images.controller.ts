import { Controller, UseGuards } from '@nestjs/common';
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import { CatalogImagesController } from '../catalog/images/catalog-images.controller.js';
import { FurnitureImageEditService } from './furniture-image-edit.service.js';
import { FurnitureImagesService } from './furniture-images.service.js';

// Картинка обстановки — маршруты общие для каталогов; веб её не показывает (картинка —
// сама модель), но загрузить её можно, как у моделей.
@Controller('furniture/:ownerId/image')
@UseGuards(SessionOrApiTokenGuard)
export class FurnitureImagesController extends CatalogImagesController {
  constructor(
    filesService: FurnitureImagesService,
    editService: FurnitureImageEditService,
  ) {
    super(filesService, editService);
  }
}
