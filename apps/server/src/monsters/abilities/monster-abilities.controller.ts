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
import { AuthGuard } from '../../auth/auth.guard.js';
import { MonsterAbilitiesService } from './monster-abilities.service.js';
import {
  AddMonsterAbilityDto,
  UpdateMonsterAbilityDto,
} from './dto/monster-ability.dto.js';

// Читаются способности вместе с карточкой (GET /monsters/:id), здесь — только правки.
@Controller('monsters/:monsterId/abilities')
@UseGuards(AuthGuard)
export class MonsterAbilitiesController {
  constructor(private readonly abilitiesService: MonsterAbilitiesService) {}

  @Post()
  add(
    @Req() req: AuthenticatedRequest,
    @Param('monsterId', ParseUUIDPipe) monsterId: string,
    @Body() dto: AddMonsterAbilityDto,
  ) {
    return this.abilitiesService.add(req.user.sub, monsterId, dto);
  }

  @Patch(':entryId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('monsterId', ParseUUIDPipe) monsterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateMonsterAbilityDto,
  ) {
    return this.abilitiesService.update(req.user.sub, monsterId, entryId, dto);
  }

  @Delete(':entryId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('monsterId', ParseUUIDPipe) monsterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.abilitiesService.remove(req.user.sub, monsterId, entryId);
  }
}
