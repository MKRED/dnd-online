import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
  type PipeTransform,
} from '@nestjs/common';
import { isBookmarkKind, type BookmarkKind } from 'shared';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { BookmarksService } from './bookmarks.service.js';

// Вид закладки из адреса: неизвестный — 400.
class ParseBookmarkKindPipe implements PipeTransform<string, BookmarkKind> {
  transform(value: string): BookmarkKind {
    if (!isBookmarkKind(value)) {
      throw new BadRequestException('Неизвестный вид закладки');
    }
    return value;
  }
}

@Controller('bookmarks')
@UseGuards(AuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.bookmarksService.list(req.user.sub);
  }

  @Get(':kind/:targetId')
  state(
    @Req() req: AuthenticatedRequest,
    @Param('kind', ParseBookmarkKindPipe) kind: BookmarkKind,
    @Param('targetId', ParseUUIDPipe) targetId: string,
  ) {
    return this.bookmarksService.state(req.user.sub, kind, targetId);
  }

  @Put(':kind/:targetId')
  add(
    @Req() req: AuthenticatedRequest,
    @Param('kind', ParseBookmarkKindPipe) kind: BookmarkKind,
    @Param('targetId', ParseUUIDPipe) targetId: string,
  ) {
    return this.bookmarksService.add(req.user.sub, kind, targetId);
  }

  @Delete(':kind/:targetId')
  @HttpCode(204)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('kind', ParseBookmarkKindPipe) kind: BookmarkKind,
    @Param('targetId', ParseUUIDPipe) targetId: string,
  ) {
    return this.bookmarksService.remove(req.user.sub, kind, targetId);
  }
}
