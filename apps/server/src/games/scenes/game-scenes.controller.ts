import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard, type AuthenticatedRequest } from '../../auth/auth.guard.js';
import { CatalogImageFileQueryDto } from '../../catalog/images/dto/catalog-image.dto.js';
import {
  ActivateSceneDto,
  AddSceneDto,
  SceneFogDto,
  SceneImageParamsDto,
  SceneOpenDto,
  SceneParamsDto,
} from './dto/scene.dto.js';
import { GameSceneViewService } from './game-scene-view.service.js';
import { GameScenesService } from './game-scenes.service.js';

// Сцены игры (docs/plan/done/game.md, этап 5): /games/:id/scenes — управление мастера,
// /games/:id/scene — активная сцена для страницы сцены.
@Controller('games/:id')
@UseGuards(AuthGuard)
export class GameScenesController {
  constructor(
    private readonly scenesService: GameScenesService,
    private readonly viewService: GameSceneViewService,
  ) {}

  @Get('scenes')
  list(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.scenesService.list(req.user.sub, id);
  }

  @Post('scenes')
  add(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddSceneDto,
  ) {
    return this.scenesService.add(req.user.sub, id, dto.mapId);
  }

  @Put('scenes/active')
  activate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateSceneDto,
  ) {
    return this.scenesService.activate(req.user.sub, id, dto.sceneId);
  }

  @Put('scenes/open')
  setOpen(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SceneOpenDto,
  ) {
    return this.scenesService.setOpen(req.user.sub, id, dto.open);
  }

  @Post('scenes/:sceneId/restart')
  restart(@Req() req: AuthenticatedRequest, @Param() params: SceneParamsDto) {
    return this.scenesService.restart(req.user.sub, params.id, params.sceneId);
  }

  @Put('scenes/:sceneId/fog')
  setFog(
    @Req() req: AuthenticatedRequest,
    @Param() params: SceneParamsDto,
    @Body() dto: SceneFogDto,
  ) {
    return this.scenesService.setFog(req.user.sub, params.id, params.sceneId, {
      enabled: dto.enabled,
      sightRange: dto.sightRange,
    });
  }

  @Get('scene')
  view(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.viewService.view(req.user.sub, id);
  }

  // Версия копии (?v=) растёт с каждым обновлением — ответ кешируется навсегда; private —
  // доступ зависит от смотрящего. Заголовок — только у удачного ответа: @Header ставит
  // его и отказу, а доступ здесь меняется переключателем, и закешированный на год 404
  // не дал бы картинке загрузиться, когда сцену откроют снова.
  @Get('scene/images/:kind/:sourceId')
  async image(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Param() params: SceneImageParamsDto,
    @Query() query: CatalogImageFileQueryDto,
  ) {
    const data = await this.viewService.imageFile(
      req.user.sub,
      params.id,
      params.kind,
      params.sourceId,
      query.variant ?? 'full',
    );
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    return new StreamableFile(data, {
      type: 'image/webp',
      length: data.length,
    });
  }
}
