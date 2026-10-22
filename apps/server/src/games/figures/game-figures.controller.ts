import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  ParseUUIDPipe,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard, type AuthenticatedRequest } from '../../auth/auth.guard.js';
import { MoveFigureDto, PlaceFigureDto } from './dto/figure.dto.js';
import { MODEL_CONTENT_TYPES } from '../../character-models/model-content-types.js';
import { GameFiguresReadService } from './game-figures-read.service.js';
import { GameFiguresService } from './game-figures.service.js';

// Фигурки персонажей на активной сцене (docs/plan/done/game.md, этап 7).
@Controller('games/:id')
@UseGuards(AuthGuard)
export class GameFiguresController {
  constructor(
    private readonly readService: GameFiguresReadService,
    private readonly figuresService: GameFiguresService,
  ) {}

  @Get('scene/figures')
  list(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.readService.list(req.user.sub, id);
  }

  // Правки отвечают фигурками глазами того, кто правил: страница показывает их сразу.
  @Post('figures/round')
  @HttpCode(200)
  round(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.figuresService.round(req.user.sub, id);
  }

  @Post('figures/:characterId/move')
  @HttpCode(200)
  move(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Body() dto: MoveFigureDto,
  ) {
    return this.figuresService.move(req.user.sub, id, characterId, dto.to);
  }

  @Put('figures/:characterId')
  place(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Body() dto: PlaceFigureDto,
  ) {
    return this.figuresService.place(req.user.sub, id, characterId, dto.at);
  }

  @Post('figures/:characterId/refresh')
  @HttpCode(200)
  refresh(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
  ) {
    return this.figuresService.allowance(
      req.user.sub,
      id,
      characterId,
      'refresh',
    );
  }

  @Post('figures/:characterId/dash')
  @HttpCode(200)
  dash(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
  ) {
    return this.figuresService.allowance(req.user.sub, id, characterId, 'dash');
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

  // Модель — как миниатюра: клиент добавляет версию в адрес, удачный ответ кешируется.
  @Get('figures/:characterId/model')
  async model(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
  ) {
    const { data, format } = await this.readService.model(
      req.user.sub,
      id,
      characterId,
    );
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    return new StreamableFile(data, {
      type: MODEL_CONTENT_TYPES[format],
      length: data.length,
    });
  }
}
