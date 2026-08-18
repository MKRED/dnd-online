import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from './auth.guard';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenService } from './token.service';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.register(dto);
    this.tokenService.setAuthCookies(res, tokens);
    return { user };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(dto);
    this.tokenService.setAuthCookies(res, tokens);
    return { user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req.cookies as Record<string, string> | undefined)?.[
      TokenService.REFRESH_COOKIE
    ];
    if (!refreshToken) {
      this.tokenService.clearAuthCookies(res);
      throw new UnauthorizedException('Refresh token missing');
    }

    const tokens = await this.authService.refresh(refreshToken);
    this.tokenService.setAuthCookies(res, tokens);
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (req.cookies as Record<string, string> | undefined)?.[
      TokenService.REFRESH_COOKIE
    ];
    await this.authService.logout(refreshToken);
    this.tokenService.clearAuthCookies(res);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      user: { id: user.id, login: user.login, nickname: user.nickname },
    };
  }
}
