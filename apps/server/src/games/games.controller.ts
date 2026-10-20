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
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { CreateGameDto } from './dto/create-game.dto.js';
import { GamesService } from './games.service.js';

// Только сессия, без API-токенов: в игру садятся люди, а не нейросеть
// (маршрут закрыт для токена по умолчанию — docs/plan/ai-access.md).
@Controller('games')
@UseGuards(AuthGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.gamesService.list(req.user.sub);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateGameDto) {
    return this.gamesService.create(req.user.sub, dto);
  }

  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.gamesService.findOne(req.user.sub, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.gamesService.remove(req.user.sub, id);
  }
}
