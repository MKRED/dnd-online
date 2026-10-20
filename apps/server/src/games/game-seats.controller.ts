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
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { TakeSeatDto } from './dto/take-seat.dto.js';
import { UpdateSeatDto } from './dto/update-seat.dto.js';
import { GameSeatsService } from './game-seats.service.js';

// Своё место в лобби. Ответ — карточка игры после изменения, лобби перерисовывается по ней.
@Controller('games/:id/seats')
@UseGuards(AuthGuard)
export class GameSeatsController {
  constructor(private readonly seatsService: GameSeatsService) {}

  @Post()
  take(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TakeSeatDto,
  ) {
    return this.seatsService.take(req.user.sub, id, dto);
  }

  @Patch('me')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSeatDto,
  ) {
    return this.seatsService.update(req.user.sub, id, dto);
  }

  @Delete('me')
  free(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.seatsService.free(req.user.sub, id);
  }
}
