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
import { BlockGroupCopyService } from './block-group-copy.service.js';
import { BlockGroupUsageService } from './block-group-usage.service.js';
import type { BlockGroupVariant } from './block-groups.config.js';
import { BlockGroupsService } from './block-groups.service.js';
import { BlockGroupDto } from './dto/block-group.dto.js';

// Список, карточка и удаление — общие (CatalogEntriesController), тело — BlockGroupDto.
@Controller('block-groups')
@UseGuards(SessionOrApiTokenGuard)
export class BlockGroupsController extends CatalogEntriesController<
  BlockGroupVariant,
  BlockGroupDto
> {
  constructor(
    service: BlockGroupsService,
    private readonly usageService: BlockGroupUsageService,
    private readonly copyService: BlockGroupCopyService,
  ) {
    super(service);
  }

  @AllowApiToken()
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: BlockGroupDto) {
    return this.service.create(req.user.sub, dto, {
      viaApiToken: req.viaApiToken,
    });
  }

  @AllowApiToken()
  @Put(':id')
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BlockGroupDto,
  ) {
    return this.service.replace(req.user.sub, id, dto, {
      viaApiToken: req.viaApiToken,
    });
  }

  // Где стоят блоки группы — для предупреждения перед удалением; только автору.
  @AllowApiToken()
  @Get(':id/usage')
  usage(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usageService.usage(req.user.sub, id);
  }

  // Скопировать себе чужую группу — свою копию со ссылкой на оригинал (этап 6б).
  @AllowApiToken()
  @Post(':id/copy')
  copy(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.copyService.copy(req.user.sub, id);
  }

  // «Подтянуть обновления»: вид и свойства копии — снова как у оригинала.
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
