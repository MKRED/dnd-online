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
import {
  AddInventoryItemDto,
  MoveInventoryEntryDto,
  UpdateInventoryEntryDto,
} from './dto/inventory.dto.js';
import { InventoryService } from './inventory.service.js';
import { AllowApiToken } from '../../api-tokens/allow-api-token.decorator.js';

// Читается инвентарь вместе с листом (GET /characters/:id), здесь — только правки.
@Controller('characters/:characterId/items')
@UseGuards(SessionOrApiTokenGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @AllowApiToken()
  @Post()
  add(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Body() dto: AddInventoryItemDto,
  ) {
    return this.inventoryService.add(req.user.sub, characterId, dto);
  }

  @AllowApiToken()
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

  @AllowApiToken()
  @Post(':entryId/move')
  move(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: MoveInventoryEntryDto,
  ) {
    return this.inventoryService.move(req.user.sub, characterId, entryId, dto);
  }

  @AllowApiToken()
  @Delete(':entryId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.inventoryService.remove(req.user.sub, characterId, entryId);
  }
}
