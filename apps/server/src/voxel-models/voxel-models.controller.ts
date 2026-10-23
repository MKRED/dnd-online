import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AllowApiToken } from '../api-tokens/allow-api-token.decorator.js';
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { CatalogEntriesController } from '../catalog/entries/catalog-entries.controller.js';
import { VoxelModelDto } from './dto/voxel-model.dto.js';
import { VoxelModelCopyService } from './voxel-model-copy.service.js';
import type { VoxelModelVariant } from './voxel-models.config.js';
import { VoxelModelsService } from './voxel-models.service.js';

// Список, карточка и удаление — общие (CatalogEntriesController), тело — VoxelModelDto.
@Controller('voxel-models')
@UseGuards(SessionOrApiTokenGuard)
export class VoxelModelsController extends CatalogEntriesController<
  VoxelModelVariant,
  VoxelModelDto
> {
  constructor(
    service: VoxelModelsService,
    private readonly copyService: VoxelModelCopyService,
  ) {
    super(service);
  }

  @AllowApiToken()
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: VoxelModelDto) {
    return this.service.create(req.user.sub, dto, {
      viaApiToken: req.viaApiToken,
    });
  }

  @AllowApiToken()
  @Put(':id')
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoxelModelDto,
  ) {
    return this.service.replace(req.user.sub, id, dto, {
      viaApiToken: req.viaApiToken,
    });
  }

  // Скопировать себе чужую модель — свою копию со ссылкой на оригинал.
  @AllowApiToken()
  @Post(':id/copy')
  copy(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.copyService.copy(req.user.sub, id);
  }

  // «Подтянуть обновления»: вид и свойства клеток копии — снова как у оригинала.
  @AllowApiToken()
  @Post(':id/pull')
  @HttpCode(200)
  pull(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.copyService.pull(req.user.sub, id);
  }
}
