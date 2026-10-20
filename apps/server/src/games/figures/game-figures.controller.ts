import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard, type AuthenticatedRequest } from '../../auth/auth.guard.js';
import { GameFiguresReadService } from './game-figures-read.service.js';

// Фигурки персонажей на активной сцене (docs/plan/game.md, этап 7).
@Controller('games/:id')
@UseGuards(AuthGuard)
export class GameFiguresController {
  constructor(private readonly readService: GameFiguresReadService) {}

  @Get('scene/figures')
  list(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.readService.list(req.user.sub, id);
  }

  // Клиент добавляет в адрес версию миниатюры (?v=), поэтому удачный ответ кешируется
  // навсегда. Заголовок — только ему: доступ меняется переключателем сцены, и
  // закешированный отказ не дал бы картинке загрузиться, когда сцену откроют.
  @Get('figures/:characterId/image')
  async image(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
  ) {
    const data = await this.readService.image(req.user.sub, id, characterId);
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    return new StreamableFile(data, {
      type: 'image/webp',
      length: data.length,
    });
  }
}
