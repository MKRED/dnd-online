import {
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/auth.guard.js';
import { ListCatalogQueryDto } from '../catalog-list-query.dto.js';
import type { CatalogEntriesService } from './catalog-entries.service.js';
import type { CatalogEntryDto } from './dto/catalog-entry.dto.js';

// Маршруты простого каталога без тела записи: список, карточка, удаление. Каждый каталог
// наследует класс со своим адресом и AuthGuard и сам объявляет POST и PUT: тело
// проверяется DTO его класса, а базовый метод не знает, какого. Nest читает декораторы
// методов и по цепочке наследования.
export abstract class CatalogEntriesController<
  V,
  D extends CatalogEntryDto = CatalogEntryDto,
> {
  protected constructor(
    protected readonly service: CatalogEntriesService<V, D>,
  ) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: ListCatalogQueryDto) {
    return this.service.list(req.user.sub, query.scope);
  }

  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(req.user.sub, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(req.user.sub, id);
  }
}
