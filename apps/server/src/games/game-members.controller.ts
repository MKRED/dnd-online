import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { EnterGameDto } from './dto/enter-game.dto.js';
import { GameMembersService } from './game-members.service.js';

@Controller('games/:id')
@UseGuards(AuthGuard)
export class GameMembersController {
  constructor(private readonly membersService: GameMembersService) {}

  // Строгий лимит — от перебора пароля закрытой игры.
  @Post('enter')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  enter(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnterGameDto,
  ) {
    return this.membersService.enter(req.user.sub, id, dto.password);
  }

  // Себя — выйти из игры, другого — убрать (только мастер).
  @Delete('members/:userId')
  @HttpCode(204)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membersService.remove(req.user.sub, id, userId);
  }
}
