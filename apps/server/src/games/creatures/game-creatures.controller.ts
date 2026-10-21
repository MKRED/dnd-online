import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../../auth/auth.guard.js';
import { GameCharacterEffectDto } from '../characters/dto/character-effect.dto.js';
import { CreatureChangeDto } from './dto/creature-change.dto.js';
import { GameCreaturesService } from './game-creatures.service.js';

// Монстры и НПС активной сцены (docs/plan/game.md, этап 8): чтение, хиты и эффекты.
@Controller('games/:id/scene/creatures')
@UseGuards(AuthGuard)
export class GameCreaturesController {
  constructor(private readonly service: GameCreaturesService) {}

  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.list(req.user.sub, id);
  }

  // Правка отвечает существами сцены глазами мастера.
  @Post(':objectId/changes')
  @HttpCode(200)
  change(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('objectId', ParseIntPipe) objectId: number,
    @Body() dto: CreatureChangeDto,
  ) {
    return this.service.change(req.user.sub, id, objectId, {
      kind: dto.kind,
      amount: dto.amount,
    });
  }

  // Эффекты отвечают списком, как у персонажа: полоса плашек — общая.
  @Post(':objectId/effects')
  addEffect(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('objectId', ParseIntPipe) objectId: number,
    @Body() dto: GameCharacterEffectDto,
  ) {
    return this.service.addEffect(req.user.sub, id, objectId, dto.effectId);
  }

  @Delete(':objectId/effects/:entryId')
  removeEffect(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('objectId', ParseIntPipe) objectId: number,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.service.removeEffect(req.user.sub, id, objectId, entryId);
  }
}
