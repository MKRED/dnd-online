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
import { MonsterAbilitiesService } from './monster-abilities.service.js';
import {
  AddMonsterAbilityDto,
  UpdateMonsterAbilityDto,
} from './dto/monster-ability.dto.js';
import { AllowApiToken } from '../../api-tokens/allow-api-token.decorator.js';

// Читаются способности вместе с карточкой (GET /monsters/:id), здесь — только правки.
@Controller('monsters/:monsterId/abilities')
@UseGuards(SessionOrApiTokenGuard)
export class MonsterAbilitiesController {
  constructor(private readonly abilitiesService: MonsterAbilitiesService) {}

  @AllowApiToken()
  @Post()
  add(
    @Req() req: AuthenticatedRequest,
    @Param('monsterId', ParseUUIDPipe) monsterId: string,
    @Body() dto: AddMonsterAbilityDto,
  ) {
    return this.abilitiesService.add(req.user.sub, monsterId, dto);
  }

  @AllowApiToken()
  @Patch(':entryId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('monsterId', ParseUUIDPipe) monsterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateMonsterAbilityDto,
  ) {
    return this.abilitiesService.update(req.user.sub, monsterId, entryId, dto);
  }

  @AllowApiToken()
  @Delete(':entryId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('monsterId', ParseUUIDPipe) monsterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.abilitiesService.remove(req.user.sub, monsterId, entryId);
  }
}
