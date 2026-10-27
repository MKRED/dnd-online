import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { EquipSlot } from 'shared';
import { AuthGuard, type AuthenticatedRequest } from '../../auth/auth.guard.js';
import {
  EquipDto,
  ParseEquipSlotPipe,
} from '../../characters/equipment/index.js';
import { GameCharactersService } from './game-characters.service.js';

// Кукла персонажа в игре (docs/plan/equipment.md, этап 4): те же адреса, что у листа, под
// игрой. Правит тот же круг, что водит фигурку; каждая правка отвечает листом целиком.
@Controller('games/:id/characters/:characterId')
@UseGuards(AuthGuard)
export class GameCharacterEquipmentController {
  constructor(private readonly service: GameCharactersService) {}

  @Put('equipment/:slot')
  equip(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('slot', ParseEquipSlotPipe) slot: EquipSlot,
    @Body() dto: EquipDto,
  ) {
    return this.service.changeEquipment(req.user.sub, id, characterId, {
      kind: 'equip',
      slot,
      entryId: dto.entryId,
    });
  }

  @Delete('equipment/:slot')
  unequip(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('slot', ParseEquipSlotPipe) slot: EquipSlot,
  ) {
    return this.service.changeEquipment(req.user.sub, id, characterId, {
      kind: 'unequip',
      slot,
    });
  }

  @Put('items/:entryId/attunement')
  attune(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.service.changeEquipment(req.user.sub, id, characterId, {
      kind: 'attune',
      entryId,
    });
  }

  @Delete('items/:entryId/attunement')
  endAttunement(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.service.changeEquipment(req.user.sub, id, characterId, {
      kind: 'end_attunement',
      entryId,
    });
  }
}
