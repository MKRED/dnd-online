import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CatalogEntriesController } from '../catalog/entries/catalog-entries.controller.js';
import type { EffectRecordFields } from './effects.config.js';
import { EffectsService } from './effects.service.js';
import { EffectDto } from './dto/effect.dto.js';

// Список, карточка и удаление — общие (CatalogEntriesController), тело — EffectDto.
@Controller('effects')
@UseGuards(AuthGuard)
export class EffectsController extends CatalogEntriesController<
  EffectRecordFields,
  EffectDto
> {
  constructor(service: EffectsService) {
    super(service);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: EffectDto) {
    return this.service.create(req.user.sub, dto);
  }

  @Put(':id')
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EffectDto,
  ) {
    return this.service.replace(req.user.sub, id, dto);
  }
}
