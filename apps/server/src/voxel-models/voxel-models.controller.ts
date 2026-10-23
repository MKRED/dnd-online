import {
  Body,
  Controller,
  Get,
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
import { VoxelModelUsageService } from './voxel-model-usage.service.js';
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
    private readonly usageService: VoxelModelUsageService,
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

  // Где стоит модель — для вопроса перед удалением; только автору (этап 8б).
  @AllowApiToken()
  @Get(':id/usage')
  usage(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usageService.usage(req.user.sub, id);
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
