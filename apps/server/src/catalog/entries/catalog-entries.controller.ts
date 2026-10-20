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
import { AllowApiToken } from '../../api-tokens/allow-api-token.decorator.js';

// Маршруты простого каталога без тела записи: список, карточка, удаление. Каждый каталог
// наследует класс со своим адресом и SessionOrApiTokenGuard и сам объявляет POST и PUT:
// тело проверяется DTO его класса, а базовый метод не знает, какого. Nest читает
// декораторы методов и по цепочке наследования. Удаление API-токену закрыто.
export abstract class CatalogEntriesController<
  V,
  D extends CatalogEntryDto = CatalogEntryDto,
> {
  protected constructor(
    protected readonly service: CatalogEntriesService<V, D>,
  ) {}

  @AllowApiToken()
  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: ListCatalogQueryDto) {
    return this.service.list(req.user.sub, query.scope);
  }

  @AllowApiToken()
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
