import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/auth.guard.js';
import { SessionOrApiTokenGuard } from '../../api-tokens/session-or-api-token.guard.js';
import { CharacterAbilitiesService } from './character-abilities.service.js';
import {
  AddCharacterAbilityDto,
  UpdateCharacterAbilityDto,
} from './dto/character-ability.dto.js';
import { AllowApiToken } from '../../api-tokens/allow-api-token.decorator.js';

// Читаются способности вместе с листом (GET /characters/:id), здесь — только правки.
@Controller('characters/:characterId/abilities')
@UseGuards(SessionOrApiTokenGuard)
export class CharacterAbilitiesController {
  constructor(private readonly abilitiesService: CharacterAbilitiesService) {}

  @AllowApiToken()
  @Post()
  add(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Body() dto: AddCharacterAbilityDto,
  ) {
    return this.abilitiesService.add(req.user.sub, characterId, dto);
  }

  @AllowApiToken()
  @Patch(':entryId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateCharacterAbilityDto,
  ) {
    return this.abilitiesService.update(
      req.user.sub,
      characterId,
      entryId,
      dto,
    );
  }

  @AllowApiToken()
  @Delete(':entryId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.abilitiesService.remove(req.user.sub, characterId, entryId);
  }
}
