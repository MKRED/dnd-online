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
import type { AbilityRecordFields } from './abilities.config.js';
import { AbilitiesService } from './abilities.service.js';
import { AbilityDto } from './dto/ability.dto.js';
import { AllowApiToken } from '../api-tokens/allow-api-token.decorator.js';

// Список, карточка и удаление — общие (CatalogEntriesController), тело — AbilityDto.
@Controller('abilities')
@UseGuards(SessionOrApiTokenGuard)
export class AbilitiesController extends CatalogEntriesController<
  AbilityRecordFields,
  AbilityDto
> {
  constructor(service: AbilitiesService) {
    super(service);
  }

  @AllowApiToken()
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: AbilityDto) {
    return this.service.create(req.user.sub, dto, {
      viaApiToken: req.viaApiToken,
    });
  }

  @AllowApiToken()
  @Put(':id')
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AbilityDto,
  ) {
    return this.service.replace(req.user.sub, id, dto, {
      viaApiToken: req.viaApiToken,
    });
  }
}
