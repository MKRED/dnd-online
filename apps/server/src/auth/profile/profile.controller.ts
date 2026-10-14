import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthGuard, type AuthenticatedRequest } from '../auth.guard.js';
import { TokenService } from '../token.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { SetCredentialsDto } from './dto/set-credentials.dto.js';
import { ProfileService } from './profile.service.js';

// Только сессия (cookie), без api-токенов: пароль меняет сам человек, а не MCP-клиент.
// Лимит — от перебора текущего пароля.
@UseGuards(AuthGuard, ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly tokenService: TokenService,
  ) {}

  @Get()
  get(@Req() req: AuthenticatedRequest) {
    return this.profileService.getProfile(req.user.sub);
  }

  @Put('credentials')
  async setCredentials(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SetCredentialsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { profile, tokens } = await this.profileService.setCredentials(
      req.user.sub,
      dto,
    );
    this.tokenService.setAuthCookies(res, tokens);
    return profile;
  }

  @Post('password')
  @HttpCode(204)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.profileService.changePassword(req.user.sub, dto);
  }
}
