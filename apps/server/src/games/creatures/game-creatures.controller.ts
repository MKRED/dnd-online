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
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../../auth/auth.guard.js';
import { GameCharacterEffectDto } from '../characters/dto/character-effect.dto.js';
import { MoveFigureDto } from '../figures/dto/figure.dto.js';
import { CreatureChangeDto } from './dto/creature-change.dto.js';
import {
  CreaturePreparedDto,
  CreatureSlotsDto,
} from './dto/creature-spells.dto.js';
import { GameCreaturesService } from './game-creatures.service.js';

// Монстры и НПС активной сцены (docs/plan/done/game.md, этап 8): чтение, хиты и эффекты;
// ход и запас движения — docs/plan/done/creature-movement.md.
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

  // Ячейки и подготовка заклинаний экземпляра НПС (вариант А после первой партии).
  @Post(':objectId/spell-slots')
  @HttpCode(200)
  spellSlots(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('objectId', ParseIntPipe) objectId: number,
    @Body() dto: CreatureSlotsDto,
  ) {
    return this.service.spellSlots(req.user.sub, id, objectId, dto.expended);
  }

  @Put(':objectId/abilities/:abilityId')
  prepared(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('objectId', ParseIntPipe) objectId: number,
    @Param('abilityId', ParseUUIDPipe) abilityId: string,
    @Body() dto: CreaturePreparedDto,
  ) {
    return this.service.prepared(
      req.user.sub,
      id,
      objectId,
      abilityId,
      dto.prepared,
    );
  }

  // Ход по пути и запас движения (docs/plan/done/creature-movement.md) — тоже ответ
  // существами сцены.
  @Post(':objectId/move')
  @HttpCode(200)
  move(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('objectId', ParseIntPipe) objectId: number,
    @Body() dto: MoveFigureDto,
  ) {
    return this.service.move(req.user.sub, id, objectId, dto.to);
  }

  @Post(':objectId/refresh')
  @HttpCode(200)
  refresh(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('objectId', ParseIntPipe) objectId: number,
  ) {
    return this.service.allowance(req.user.sub, id, objectId, 'refresh');
  }

  @Post(':objectId/dash')
  @HttpCode(200)
  dash(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('objectId', ParseIntPipe) objectId: number,
  ) {
    return this.service.allowance(req.user.sub, id, objectId, 'dash');
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
