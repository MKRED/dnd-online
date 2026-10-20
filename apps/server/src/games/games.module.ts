import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { GameEventsController } from './game-events.controller.js';
import { GameEventsService } from './game-events.service.js';
import { GameSessionController } from './game-session.controller.js';
import { GameSessionService } from './game-session.service.js';
import { GameMembersController } from './game-members.controller.js';
import { GameMembersService } from './game-members.service.js';
import { GameSeatsController } from './game-seats.controller.js';
import { GameSeatsService } from './game-seats.service.js';
import { GamesController } from './games.controller.js';
import { GamesService } from './games.service.js';

// Игры (docs/plan/game.md): общий список, лобби, места, встреча и журнал игры.
@Module({
  imports: [AuthModule],
  controllers: [
    GamesController,
    GameMembersController,
    GameSeatsController,
    GameEventsController,
    GameSessionController,
  ],
  providers: [
    GamesService,
    GameMembersService,
    GameSeatsService,
    GameEventsService,
    GameSessionService,
  ],
})
export class GamesModule {}
