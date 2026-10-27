import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../../auth/auth.guard.js';
import {
  CombatantsDto,
  CombatInitiativeDto,
  CombatOrderDto,
  CombatRollDto,
  CombatTurnDto,
  toCombatants,
} from './dto/combat.dto.js';
import { GameCombatService } from './game-combat.service.js';

// Бой с очерёдностью (docs/plan/combat.md, этап 2): участники, инициатива, очередь, ходы.
// Правки отвечают очередью глазами того, кто правил.
@Controller('games/:id/combat')
@UseGuards(AuthGuard)
export class GameCombatController {
  constructor(private readonly combat: GameCombatService) {}

  @Get()
  read(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.combat.read(req.user.sub, id);
  }

  // «Начать бой» с участниками. Только мастер.
  @Post('start')
  @HttpCode(200)
  start(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CombatantsDto,
  ) {
    return this.combat.start(req.user.sub, id, toCombatants(dto));
  }

  // Новичок в идущем бою. Только мастер.
  @Post('combatants')
  @HttpCode(200)
  join(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CombatantsDto,
  ) {
    return this.combat.join(req.user.sub, id, toCombatants(dto));
  }

  @Delete('combatants/:combatantId')
  leave(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('combatantId', ParseUUIDPipe) combatantId: string,
  ) {
    return this.combat.leave(req.user.sub, id, combatantId);
  }

  // «Бросить кубик» в окне броска: отвечает броском и очередью.
  @Post('combatants/:combatantId/initiative')
  @HttpCode(200)
  roll(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('combatantId', ParseUUIDPipe) combatantId: string,
    @Body() dto: CombatRollDto,
  ) {
    return this.combat.roll(req.user.sub, id, combatantId, dto.mode ?? null);
  }

  // Мастер ставит число сам.
  @Put('combatants/:combatantId/initiative')
  setInitiative(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('combatantId', ParseUUIDPipe) combatantId: string,
    @Body() dto: CombatInitiativeDto,
  ) {
    return this.combat.setInitiative(
      req.user.sub,
      id,
      combatantId,
      dto.initiative,
    );
  }

  // «Бросить за монстров»: все не бросившие монстры и НПС.
  @Post('initiative/creatures')
  @HttpCode(200)
  rollCreatures(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.combat.rollCreatures(req.user.sub, id);
  }

  @Put('order')
  reorder(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CombatOrderDto,
  ) {
    return this.combat.reorder(req.user.sub, id, dto.ids);
  }

  // «Закончить ход»: combatantId — чей ход заканчивают.
  @Post('turn/end')
  @HttpCode(200)
  endTurn(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CombatTurnDto,
  ) {
    return this.combat.endTurn(req.user.sub, id, dto.combatantId);
  }

  // Мастер отдаёт ход участнику.
  @Put('turn')
  passTurn(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CombatTurnDto,
  ) {
    return this.combat.passTurn(req.user.sub, id, dto.combatantId);
  }
}
