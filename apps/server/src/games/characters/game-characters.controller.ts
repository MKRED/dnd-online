import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../../auth/auth.guard.js';
import {
  CharacterChangeDto,
  toCharacterChange,
} from './dto/character-change.dto.js';
import { GameCharacterEffectDto } from './dto/character-effect.dto.js';
import { GameCharactersService } from './game-characters.service.js';

// Персонаж игрока в игре (docs/plan/done/game.md, этап 8): лист, правки хитов и ячеек, эффекты.
@Controller('games/:id/characters/:characterId')
@UseGuards(AuthGuard)
export class GameCharactersController {
  constructor(private readonly service: GameCharactersService) {}

  @Get()
  read(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
  ) {
    return this.service.read(req.user.sub, id, characterId);
  }

  // Правка отвечает листом целиком: карточка и лист показывают его сразу.
  @Post('changes')
  @HttpCode(200)
  change(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Body() dto: CharacterChangeDto,
  ) {
    return this.service.change(
      req.user.sub,
      id,
      characterId,
      toCharacterChange(dto),
    );
  }

  // Эффекты отвечают списком, как на странице персонажа: полоса плашек — общая.
  @Post('effects')
  addEffect(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Body() dto: GameCharacterEffectDto,
  ) {
    return this.service.addEffect(req.user.sub, id, characterId, dto.effectId);
  }

  @Delete('effects/:entryId')
  removeEffect(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.service.removeEffect(req.user.sub, id, characterId, entryId);
  }
}
