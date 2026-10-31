import { Controller, UseGuards } from '@nestjs/common';
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import { CatalogImagesController } from '../catalog/images/catalog-images.controller.js';
import { VoxelModelImageEditService } from './voxel-model-image-edit.service.js';
import { VoxelModelImagesService } from './voxel-model-images.service.js';

// Картинка модели — маршруты общие для каталогов. У модели с загруженным файлом веб кладёт
// сюда её снимок и показывает его миниатюрой в списке (docs/plan/blocks.md, этап 9г);
// у воксельной модели картинку не показывает — миниатюра рисуется по вокселям.
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
