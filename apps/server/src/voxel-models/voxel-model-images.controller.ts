import { Controller, UseGuards } from '@nestjs/common';
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import { CatalogImagesController } from '../catalog/images/catalog-images.controller.js';
import { VoxelModelImageEditService } from './voxel-model-image-edit.service.js';
import { VoxelModelImagesService } from './voxel-model-images.service.js';

// Картинка модели — маршруты общие для каталогов; веб её не показывает (картинка модели —
// сама модель), но загрузить её можно, как у групп блоков.
@Controller('voxel-models/:ownerId/image')
@UseGuards(SessionOrApiTokenGuard)
export class VoxelModelImagesController extends CatalogImagesController {
  constructor(
    filesService: VoxelModelImagesService,
    editService: VoxelModelImageEditService,
  ) {
    super(filesService, editService);
  }
}
