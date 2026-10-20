import { Controller, UseGuards } from '@nestjs/common';
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import { CatalogImagesController } from '../catalog/images/catalog-images.controller.js';
import { MonsterImageEditService } from './monster-image-edit.service.js';
import { MonsterImagesService } from './monster-images.service.js';

// Маршруты — общие для каталогов (CatalogImagesController).
@Controller('monsters/:ownerId/image')
@UseGuards(SessionOrApiTokenGuard)
export class MonsterImagesController extends CatalogImagesController {
  constructor(
    filesService: MonsterImagesService,
    editService: MonsterImageEditService,
  ) {
    super(filesService, editService);
  }
}
