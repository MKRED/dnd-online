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
import { MonsterItemsService } from './monster-items.service.js';
import {
  AddMonsterItemDto,
  UpdateMonsterItemDto,
} from './dto/monster-item.dto.js';
import { AllowApiToken } from '../../api-tokens/allow-api-token.decorator.js';

// Читается снаряжение вместе с карточкой (GET /monsters/:id), здесь — только правки.
@Controller('monsters/:monsterId/items')
@UseGuards(SessionOrApiTokenGuard)
export class MonsterItemsController {
  constructor(private readonly itemsService: MonsterItemsService) {}

  @AllowApiToken()
  @Post()
  add(
    @Req() req: AuthenticatedRequest,
    @Param('monsterId', ParseUUIDPipe) monsterId: string,
    @Body() dto: AddMonsterItemDto,
  ) {
    return this.itemsService.add(req.user.sub, monsterId, dto);
  }

  @AllowApiToken()
  @Patch(':entryId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('monsterId', ParseUUIDPipe) monsterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateMonsterItemDto,
  ) {
    return this.itemsService.update(req.user.sub, monsterId, entryId, dto);
  }

  @AllowApiToken()
  @Delete(':entryId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('monsterId', ParseUUIDPipe) monsterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.itemsService.remove(req.user.sub, monsterId, entryId);
  }
}
