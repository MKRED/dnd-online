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
import { AuthGuard, type AuthenticatedRequest } from '../../auth/auth.guard.js';
import {
  AddInventoryItemDto,
  MoveInventoryEntryDto,
} from '../../characters/inventory/dto/inventory.dto.js';
import { GameInventoryQuantityDto } from './dto/inventory-quantity.dto.js';
import { GameCharactersService } from './game-characters.service.js';

// Инвентарь героя в игре (docs/plan/gm-items.md, этап 1): те же адреса, что у листа, под
// игрой. Правит только мастер; каждая правка отвечает листом целиком.
@Controller('games/:id/characters/:characterId/items')
@UseGuards(AuthGuard)
export class GameCharacterInventoryController {
  constructor(private readonly service: GameCharactersService) {}

  @Post()
  add(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Body() dto: AddInventoryItemDto,
  ) {
    return this.service.changeInventory(req.user.sub, id, characterId, {
      kind: 'add',
      itemId: dto.itemId,
      quantity: dto.quantity,
      location: dto.location,
      ...(dto.unpack ? { unpack: true } : {}),
    });
  }

  @Post(':entryId/move')
  move(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: MoveInventoryEntryDto,
  ) {
    return this.service.changeInventory(req.user.sub, id, characterId, {
      kind: 'move',
      entryId,
      quantity: dto.quantity,
      location: dto.location,
    });
  }

  @Patch(':entryId')
  setQuantity(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: GameInventoryQuantityDto,
  ) {
    return this.service.changeInventory(req.user.sub, id, characterId, {
      kind: 'quantity',
      entryId,
      quantity: dto.quantity,
    });
  }

  @Delete(':entryId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.service.changeInventory(req.user.sub, id, characterId, {
      kind: 'remove',
      entryId,
    });
  }
}
