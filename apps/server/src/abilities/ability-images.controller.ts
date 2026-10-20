import { Controller, UseGuards } from '@nestjs/common';
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import { CatalogImagesController } from '../catalog/images/catalog-images.controller.js';
import { AbilityImageEditService } from './ability-image-edit.service.js';
import { AbilityImagesService } from './ability-images.service.js';

// Маршруты — общие для каталогов (CatalogImagesController).
@Controller('abilities/:ownerId/image')
@UseGuards(SessionOrApiTokenGuard)
export class AbilityImagesController extends CatalogImagesController {
  constructor(
    filesService: AbilityImagesService,
    editService: AbilityImageEditService,
  ) {
    super(filesService, editService);
  }
}
