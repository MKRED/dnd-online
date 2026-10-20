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
import { CharacterEffectsService } from './character-effects.service.js';
import { AddCharacterEffectDto } from './dto/character-effect.dto.js';
import { AllowApiToken } from '../../api-tokens/allow-api-token.decorator.js';

// Читаются эффекты вместе с листом (GET /characters/:id), здесь — только правки.
@Controller('characters/:characterId/effects')
@UseGuards(SessionOrApiTokenGuard)
export class CharacterEffectsController {
  constructor(private readonly effectsService: CharacterEffectsService) {}

  @AllowApiToken()
  @Post()
  add(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Body() dto: AddCharacterEffectDto,
  ) {
    return this.effectsService.add(req.user.sub, characterId, dto);
  }

  @AllowApiToken()
  @Delete(':entryId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.effectsService.remove(req.user.sub, characterId, entryId);
  }
}
