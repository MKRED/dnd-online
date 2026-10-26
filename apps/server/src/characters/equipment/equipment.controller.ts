import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
  type PipeTransform,
} from '@nestjs/common';
import { EQUIP_SLOTS, type EquipSlot } from 'shared';
import { AllowApiToken } from '../../api-tokens/allow-api-token.decorator.js';
import { SessionOrApiTokenGuard } from '../../api-tokens/session-or-api-token.guard.js';
import type { AuthenticatedRequest } from '../../auth/auth.guard.js';
import { EquipDto } from './equipment.dto.js';
import { EquipmentService } from './equipment.service.js';

// Место куклы из адреса: неизвестное — 400.
class ParseEquipSlotPipe implements PipeTransform<string, EquipSlot> {
  transform(value: string): EquipSlot {
    if (!(EQUIP_SLOTS as readonly string[]).includes(value)) {
      throw new BadRequestException('Нет такого места на кукле');
    }
    return value as EquipSlot;
  }
}

// Надетое и настройка читаются с инвентарём (GET /characters/:id), здесь — только правки.
@Controller('characters/:characterId')
@UseGuards(SessionOrApiTokenGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @AllowApiToken()
  @Put('equipment/:slot')
  equip(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('slot', ParseEquipSlotPipe) slot: EquipSlot,
    @Body() dto: EquipDto,
  ) {
    return this.equipmentService.equip(
      req.user.sub,
      characterId,
      slot,
      dto.entryId,
    );
  }

  @AllowApiToken()
  @Delete('equipment/:slot')
  unequip(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('slot', ParseEquipSlotPipe) slot: EquipSlot,
  ) {
    return this.equipmentService.unequip(req.user.sub, characterId, slot);
  }

  // Настройка — у строки инвентаря: снятый предмет её не теряет (docs/dnd/weapons-armor.md).
  @AllowApiToken()
  @Put('items/:entryId/attunement')
  attune(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.equipmentService.attune(
      req.user.sub,
      characterId,
      entryId,
      true,
    );
  }

  @AllowApiToken()
  @Delete('items/:entryId/attunement')
  endAttunement(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.equipmentService.attune(
      req.user.sub,
      characterId,
      entryId,
      false,
    );
  }
}
