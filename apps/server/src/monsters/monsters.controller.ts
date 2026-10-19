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
import type { MonsterFields } from 'shared';
import { MonsterDto } from './dto/monster.dto.js';
import { MonstersService } from './monsters.service.js';

// Список, карточка и удаление — общие (CatalogEntriesController), тело — MonsterDto.
@Controller('monsters')
@UseGuards(AuthGuard)
export class MonstersController extends CatalogEntriesController<
  MonsterFields,
  MonsterDto
> {
  constructor(service: MonstersService) {
    super(service);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: MonsterDto) {
    return this.service.create(req.user.sub, dto);
  }

  @Put(':id')
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MonsterDto,
  ) {
    return this.service.replace(req.user.sub, id, dto);
  }
}
