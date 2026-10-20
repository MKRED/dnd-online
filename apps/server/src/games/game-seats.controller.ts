import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { SeatControllerDto } from './dto/seat-controller.dto.js';
import { TakeSeatDto } from './dto/take-seat.dto.js';
import { UpdateSeatDto } from './dto/update-seat.dto.js';
import { GameSeatsService } from './game-seats.service.js';

// Своё место в лобби и управляющий чужим (мастер). Ответ — карточка игры после изменения,
// лобби перерисовывается по ней.
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

  // Место — по игроку, который на нём сидит.
  @Put(':userId/controller')
  setController(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SeatControllerDto,
  ) {
    return this.seatsService.setController(
      req.user.sub,
      id,
      userId,
      dto.controllerId,
    );
  }
}
