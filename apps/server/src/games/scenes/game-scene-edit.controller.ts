import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../../auth/auth.guard.js';
import { ApplyOpsDto } from '../../maps/dto/apply-ops.dto.js';
import { SceneParamsDto } from './dto/scene.dto.js';
import { GameSceneEditService } from './game-scene-edit.service.js';

// Правки сцены мастером (docs/plan/game.md, этап 6) — как /maps/:id/ops, undo, redo, но
// для сцены игры. Ответ — тот же MapEditResult, что у карты.
@Controller('games/:id/scenes/:sceneId')
@UseGuards(AuthGuard)
export class GameSceneEditController {
  constructor(private readonly editService: GameSceneEditService) {}

  @Post('ops')
  @HttpCode(200)
  applyOps(
    @Req() req: AuthenticatedRequest,
    @Param() params: SceneParamsDto,
    @Body() dto: ApplyOpsDto,
  ) {
    return this.editService.applyOps(
      req.user.sub,
      params.id,
      params.sceneId,
      dto.ops,
    );
  }

  @Post('undo')
  @HttpCode(200)
  undo(@Req() req: AuthenticatedRequest, @Param() params: SceneParamsDto) {
    return this.editService.undo(req.user.sub, params.id, params.sceneId);
  }

  @Post('redo')
  @HttpCode(200)
  redo(@Req() req: AuthenticatedRequest, @Param() params: SceneParamsDto) {
    return this.editService.redo(req.user.sub, params.id, params.sceneId);
  }
}
