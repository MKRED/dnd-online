import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../auth/auth.guard.js';
import {
  AttackKeyDto,
  CombatAttackDto,
  CombatWeaponSetDto,
  toTargetRef,
} from './dto/combat-attack.dto.js';
import { GameCombatAttackService } from './game-combat-attack.service.js';

// Атаки героев (docs/plan/combat.md, этап 5): цели под значком, бросок атаки и урона,
// набор оружия «Ближний | Дальний».
@Controller('games/:id/combat/combatants/:combatantId')
@UseGuards(AuthGuard)
export class GameCombatAttackController {
  constructor(private readonly attacks: GameCombatAttackService) {}

  // Цели атаки attack: расстояние, укрытие, что войдёт в бросок; КД — мастеру.
  @Get('targets')
  targets(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('combatantId', ParseUUIDPipe) combatantId: string,
    @Query() query: AttackKeyDto,
  ) {
    return this.attacks.targets(req.user.sub, id, combatantId, query.attack);
  }

  // «Бросить кубик»: тратит действие, отвечает броском, попаданием и очередью.
  @Post('attack')
  @HttpCode(200)
  attack(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('combatantId', ParseUUIDPipe) combatantId: string,
    @Body() dto: CombatAttackDto,
  ) {
    return this.attacks.attack(req.user.sub, id, combatantId, {
      attack: dto.attack,
      target: toTargetRef(dto.target),
      ...(dto.mode && { mode: dto.mode }),
    });
  }

  // «Бросить урон» по последнему попаданию.
  @Post('damage')
  @HttpCode(200)
  damage(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('combatantId', ParseUUIDPipe) combatantId: string,
  ) {
    return this.attacks.damage(req.user.sub, id, combatantId);
  }

  @Put('weapon-set')
  weaponSet(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('combatantId', ParseUUIDPipe) combatantId: string,
    @Body() dto: CombatWeaponSetDto,
  ) {
    return this.attacks.weaponSet(req.user.sub, id, combatantId, dto.set);
  }
}
