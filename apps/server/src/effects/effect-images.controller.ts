import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CatalogImagesController } from '../catalog/images/catalog-images.controller.js';
import { EffectImageEditService } from './effect-image-edit.service.js';
import { EffectImagesService } from './effect-images.service.js';

// Маршруты — общие для каталогов (CatalogImagesController).
@Controller('effects/:ownerId/image')
@UseGuards(AuthGuard)
export class EffectImagesController extends CatalogImagesController {
  constructor(
    filesService: EffectImagesService,
    editService: EffectImageEditService,
  ) {
    super(filesService, editService);
  }
}
