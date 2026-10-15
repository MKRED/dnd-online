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
import type { AbilityVariant } from 'shared';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CatalogEntriesController } from '../catalog/entries/catalog-entries.controller.js';
import { AbilitiesService } from './abilities.service.js';
import { AbilityDto } from './dto/ability.dto.js';

// Список, карточка и удаление — общие (CatalogEntriesController), тело — AbilityDto.
@Controller('abilities')
@UseGuards(AuthGuard)
export class AbilitiesController extends CatalogEntriesController<AbilityVariant> {
  constructor(service: AbilitiesService) {
    super(service);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: AbilityDto) {
    return this.service.create(req.user.sub, dto);
  }

  @Put(':id')
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AbilityDto,
  ) {
    return this.service.replace(req.user.sub, id, dto);
  }
}
