import {
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { GameSessionService } from './game-session.service.js';

@Controller('games/:id/session')
@UseGuards(AuthGuard)
export class GameSessionController {
  constructor(private readonly sessionService: GameSessionService) {}

  // Начать встречу (только мастер).
  @Post()
  start(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.start(req.user.sub, id);
  }

  // Закончить встречу: листы персонажей снова открыты.
  @Delete()
  end(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.end(req.user.sub, id);
  }
}
