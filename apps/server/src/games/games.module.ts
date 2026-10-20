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
import {
  GameFiguresController,
  GameFiguresReadService,
  GameFiguresService,
} from './figures/index.js';
import { GameLibraryController, GameLibraryService } from './library/index.js';
import { GameRealtimeGateway } from './realtime/game-realtime.gateway.js';
import { GameRealtimeService } from './realtime/game-realtime.service.js';
import { MapLimitsConfig } from '../maps/map-limits.js';
import {
  GameSceneEditController,
  GameSceneEditService,
  GameScenesController,
  GameScenesService,
  GameSceneViewService,
} from './scenes/index.js';

// Игры (docs/plan/game.md): общий список, лобби, места, встреча, журнал игры, библиотека,
// сцены, фигурки персонажей и сокет.
@Module({
  imports: [AuthModule],
  controllers: [
    GamesController,
    GameMembersController,
    GameSeatsController,
    GameEventsController,
    GameSessionController,
    GameLibraryController,
    GameScenesController,
    GameSceneEditController,
    GameFiguresController,
  ],
  providers: [
    GamesService,
    GameMembersService,
    GameSeatsService,
    GameEventsService,
    GameSessionService,
    GameLibraryService,
    GameScenesService,
    GameSceneViewService,
    GameSceneEditService,
    GameFiguresReadService,
    GameFiguresService,
    // Пределы правки карты — и для правок сцены (этап 6).
    MapLimitsConfig,
    GameRealtimeService,
    GameRealtimeGateway,
  ],
  // Рассылка изменений нужна и персонажам: удаление персонажа освобождает место.
  exports: [GameRealtimeService],
})
export class GamesModule {}
