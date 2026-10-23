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
import { FurnitureDto } from './dto/furniture.dto.js';
import { FurnitureCopyService } from './furniture-copy.service.js';
import type { FurnitureVariant } from './furniture.config.js';
import { FurnitureService } from './furniture.service.js';

// Список, карточка и удаление — общие (CatalogEntriesController), тело — FurnitureDto.
@Controller('furniture')
@UseGuards(SessionOrApiTokenGuard)
export class FurnitureController extends CatalogEntriesController<
  FurnitureVariant,
  FurnitureDto
> {
  constructor(
    service: FurnitureService,
    private readonly copyService: FurnitureCopyService,
  ) {
    super(service);
  }

  @AllowApiToken()
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: FurnitureDto) {
    return this.service.create(req.user.sub, dto, {
      viaApiToken: req.viaApiToken,
    });
  }

  @AllowApiToken()
  @Put(':id')
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FurnitureDto,
  ) {
    return this.service.replace(req.user.sub, id, dto, {
      viaApiToken: req.viaApiToken,
    });
  }

  // Скопировать себе чужую обстановку — вместе с её моделью.
  @AllowApiToken()
  @Post(':id/copy')
  copy(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.copyService.copy(req.user.sub, id);
  }

  // «Подтянуть обновления»: крепление и модель копии — снова как у оригинала.
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
