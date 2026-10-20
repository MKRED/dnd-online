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
import type { MonsterRecordFields } from 'shared';
import { MonsterDto } from './dto/monster.dto.js';
import { MonstersService } from './monsters.service.js';
import { AllowApiToken } from '../api-tokens/allow-api-token.decorator.js';

// Список, карточка и удаление — общие (CatalogEntriesController), тело — MonsterDto.
@Controller('monsters')
@UseGuards(SessionOrApiTokenGuard)
export class MonstersController extends CatalogEntriesController<
  MonsterRecordFields,
  MonsterDto
> {
  constructor(service: MonstersService) {
    super(service);
  }

  @AllowApiToken()
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: MonsterDto) {
    return this.service.create(req.user.sub, dto, {
      viaApiToken: req.viaApiToken,
    });
  }

  @AllowApiToken()
  @Put(':id')
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MonsterDto,
  ) {
    return this.service.replace(req.user.sub, id, dto, {
      viaApiToken: req.viaApiToken,
    });
  }
}
