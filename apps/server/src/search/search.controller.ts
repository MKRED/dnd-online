import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { SearchQueryDto } from './search-query.dto.js';
import { SearchService } from './search.service.js';

// Общий поиск из шапки сайта. Только по входу на сайте: API-токену (нейросети) он не
// нужен, она ищет через маршруты разделов.
@Controller('search')
@UseGuards(AuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Req() req: AuthenticatedRequest, @Query() query: SearchQueryDto) {
    return this.searchService.search(
      req.user.sub,
      query.q,
      query.kind,
      query.limit,
    );
  }
}
