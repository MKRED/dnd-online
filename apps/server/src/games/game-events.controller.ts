import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { ListGameEventsDto } from './dto/list-game-events.dto.js';
import { GameEventsService } from './game-events.service.js';

@Controller('games/:id/events')
@UseGuards(AuthGuard)
export class GameEventsController {
  constructor(private readonly eventsService: GameEventsService) {}

  // Журнал игры, новые сверху; только мастеру.
  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListGameEventsDto,
  ) {
    return this.eventsService.list(req.user.sub, id, query);
  }
}
