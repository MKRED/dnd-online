import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/auth.guard.js';
import { AuthGuard } from '../../auth/auth.guard.js';
import { MonsterEffectsService } from './monster-effects.service.js';
import { AddMonsterEffectDto } from './dto/monster-effect.dto.js';

// Читаются эффекты вместе с карточкой (GET /monsters/:id), здесь — только правки.
@Controller('monsters/:monsterId/effects')
@UseGuards(AuthGuard)
export class MonsterEffectsController {
  constructor(private readonly effectsService: MonsterEffectsService) {}

  @Post()
  add(
    @Req() req: AuthenticatedRequest,
    @Param('monsterId', ParseUUIDPipe) monsterId: string,
    @Body() dto: AddMonsterEffectDto,
  ) {
    return this.effectsService.add(req.user.sub, monsterId, dto);
  }

  @Delete(':entryId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('monsterId', ParseUUIDPipe) monsterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.effectsService.remove(req.user.sub, monsterId, entryId);
  }
}
