import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { GameMembersController } from './game-members.controller.js';
import { GameMembersService } from './game-members.service.js';
import { GameSeatsController } from './game-seats.controller.js';
import { GameSeatsService } from './game-seats.service.js';
import { GamesController } from './games.controller.js';
import { GamesService } from './games.service.js';

// Игры (docs/plan/game.md): общий список, лобби и места.
@Module({
  imports: [AuthModule],
  controllers: [GamesController, GameMembersController, GameSeatsController],
  providers: [GamesService, GameMembersService, GameSeatsService],
})
export class GamesModule {}
