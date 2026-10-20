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
import { SessionOrApiTokenGuard } from '../../api-tokens/session-or-api-token.guard.js';
import { MonsterEffectsService } from './monster-effects.service.js';
import { AddMonsterEffectDto } from './dto/monster-effect.dto.js';
import { AllowApiToken } from '../../api-tokens/allow-api-token.decorator.js';

// Читаются эффекты вместе с карточкой (GET /monsters/:id), здесь — только правки.
@Controller('monsters/:monsterId/effects')
@UseGuards(SessionOrApiTokenGuard)
export class MonsterEffectsController {
  constructor(private readonly effectsService: MonsterEffectsService) {}

  @AllowApiToken()
  @Post()
  add(
    @Req() req: AuthenticatedRequest,
    @Param('monsterId', ParseUUIDPipe) monsterId: string,
    @Body() dto: AddMonsterEffectDto,
  ) {
    return this.effectsService.add(req.user.sub, monsterId, dto);
  }

  @AllowApiToken()
  @Delete(':entryId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('monsterId', ParseUUIDPipe) monsterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.effectsService.remove(req.user.sub, monsterId, entryId);
  }
}
