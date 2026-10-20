import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/auth.guard.js';
import { SessionOrApiTokenGuard } from '../../api-tokens/session-or-api-token.guard.js';
import { MapCatalogQueryDto } from './map-catalog-query.dto.js';
import { MapCatalogService } from './map-catalog.service.js';
import { AllowApiToken } from '../../api-tokens/allow-api-token.decorator.js';

// Отдельный адрес, а не /maps/catalog: там его перехватил бы /maps/:id.
@Controller('map-catalog')
@UseGuards(SessionOrApiTokenGuard)
export class MapCatalogController {
  constructor(private readonly catalogService: MapCatalogService) {}

  @AllowApiToken()
  @Get()
  search(@Req() req: AuthenticatedRequest, @Query() query: MapCatalogQueryDto) {
    return this.catalogService.search(req.user.sub, query.kind, query.q);
  }
}
