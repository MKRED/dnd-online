import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../../auth/auth.guard.js';
import { CatalogImageFileQueryDto } from '../../catalog/images/dto/catalog-image.dto.js';
import { LibraryEntryParamsDto } from './dto/library-entry-params.dto.js';
import { GameLibraryService } from './game-library.service.js';

// Библиотека игры — только мастеру (docs/plan/game.md, этап 4).
@Controller('games/:id/library')
@UseGuards(AuthGuard)
export class GameLibraryController {
  constructor(private readonly libraryService: GameLibraryService) {}

  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.libraryService.list(req.user.sub, id);
  }

  @Get(':kind/:sourceId')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param() params: LibraryEntryParamsDto,
  ) {
    const { id, kind, sourceId } = params;
    return this.libraryService.findOne(req.user.sub, id, { kind, sourceId });
  }

  // Версия копии картинки (?v=) растёт с каждым обновлением, поэтому ответ можно
  // кешировать навсегда; private — библиотеку видит только мастер.
  @Get(':kind/:sourceId/image')
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async image(
    @Req() req: AuthenticatedRequest,
    @Param() params: LibraryEntryParamsDto,
    @Query() query: CatalogImageFileQueryDto,
  ) {
    const { id, kind, sourceId } = params;
    const data = await this.libraryService.imageFile(
      req.user.sub,
      id,
      { kind, sourceId },
      query.variant ?? 'full',
    );
    return new StreamableFile(data, {
      type: 'image/webp',
      length: data.length,
    });
  }

  // «Обновить из справочника».
  @Post(':kind/:sourceId/refresh')
  refresh(
    @Req() req: AuthenticatedRequest,
    @Param() params: LibraryEntryParamsDto,
  ) {
    const { id, kind, sourceId } = params;
    return this.libraryService.refresh(req.user.sub, id, { kind, sourceId });
  }
}
