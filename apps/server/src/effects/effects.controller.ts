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
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import { CatalogEntriesController } from '../catalog/entries/catalog-entries.controller.js';
import type { EffectFields } from 'shared';
import { EffectsService } from './effects.service.js';
import { EffectDto } from './dto/effect.dto.js';
import { AllowApiToken } from '../api-tokens/allow-api-token.decorator.js';

// Список, карточка и удаление — общие (CatalogEntriesController), тело — EffectDto.
@Controller('effects')
@UseGuards(SessionOrApiTokenGuard)
export class EffectsController extends CatalogEntriesController<
  EffectFields,
  EffectDto
> {
  constructor(service: EffectsService) {
    super(service);
  }

  @AllowApiToken()
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: EffectDto) {
    return this.service.create(req.user.sub, dto, {
      viaApiToken: req.viaApiToken,
    });
  }

  @AllowApiToken()
  @Put(':id')
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EffectDto,
  ) {
    return this.service.replace(req.user.sub, id, dto, {
      viaApiToken: req.viaApiToken,
    });
  }
}
