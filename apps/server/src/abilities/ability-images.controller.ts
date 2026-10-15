import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CatalogImagesController } from '../catalog/images/catalog-images.controller.js';
import { AbilityImageEditService } from './ability-image-edit.service.js';
import { AbilityImagesService } from './ability-images.service.js';

// Маршруты — общие для каталогов (CatalogImagesController).
@Controller('abilities/:ownerId/image')
@UseGuards(AuthGuard)
export class AbilityImagesController extends CatalogImagesController {
  constructor(
    filesService: AbilityImagesService,
    editService: AbilityImageEditService,
  ) {
    super(filesService, editService);
  }
}
