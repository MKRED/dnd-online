import { Controller, UseGuards } from '@nestjs/common';
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import { CatalogImagesController } from '../catalog/images/catalog-images.controller.js';
import { BlockGroupImageEditService } from './block-group-image-edit.service.js';
import { BlockGroupImagesService } from './block-group-images.service.js';

// Картинка группы для справочника; маршруты — общие для каталогов.
@Controller('block-groups/:ownerId/image')
@UseGuards(SessionOrApiTokenGuard)
export class BlockGroupImagesController extends CatalogImagesController {
  constructor(
    filesService: BlockGroupImagesService,
    editService: BlockGroupImageEditService,
  ) {
    super(filesService, editService);
  }
}
