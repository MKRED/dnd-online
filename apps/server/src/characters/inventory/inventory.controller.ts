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
import {
  AddInventoryItemDto,
  MoveInventoryEntryDto,
  UpdateInventoryEntryDto,
} from './dto/inventory.dto.js';
import { InventoryService } from './inventory.service.js';

// Читается инвентарь вместе с листом (GET /characters/:id), здесь — только правки.
@Controller('characters/:characterId/items')
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  add(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Body() dto: AddInventoryItemDto,
  ) {
    return this.inventoryService.add(req.user.sub, characterId, dto);
  }

  @Patch(':entryId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateInventoryEntryDto,
  ) {
    return this.inventoryService.update(
      req.user.sub,
      characterId,
      entryId,
      dto,
    );
  }

  @Post(':entryId/move')
  move(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: MoveInventoryEntryDto,
  ) {
    return this.inventoryService.move(req.user.sub, characterId, entryId, dto);
  }

  @Delete(':entryId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.inventoryService.remove(req.user.sub, characterId, entryId);
  }
}
