import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { readUserSettings, type UserSettings } from 'shared';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { TokenService } from './token.service.js';

export const PASSWORD_SALT_ROUNDS = 10;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  login: string;
  nickname: string;
  // Приходят вместе с пользователем, чтобы веб знал их с первого экрана.
  settings: UserSettings;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly refreshTokenService: RefreshTokenService,
    @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const existing = await this.usersService.findByLogin(dto.login);
    if (existing) {
      throw new ConflictException('Login already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const user = await this.usersService.createUser({
      login: dto.login,
      nickname: dto.nickname,
      passwordHash,
    });

    const tokens = await this.issueTokens(user.id, user.login);
    return { user: toPublicUser(user), tokens };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const user = await this.usersService.findByLogin(dto.login);
    // Без хэша — аккаунт из лольки, пароль ему ещё не задали: отказ тем же ответом,
    // чтобы по ошибке нельзя было узнать, что такой логин есть.
    const passwordOk =
      user?.passwordHash != null &&
      (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !passwordOk) {
      this.logger.warn({ login: dto.login }, 'Login attempt failed');
      throw new UnauthorizedException('Invalid login or password');
    }

    const tokens = await this.issueTokens(user.id, user.login);
    return { user: toPublicUser(user), tokens };
  }

  // Вход, личность для которого уже подтвердил кто-то другой (лолька): только выдаём токены.
  async signIn(
    user: UserRow,
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const tokens = await this.issueTokens(user.id, user.login);
    return { user: toPublicUser(user), tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string; login: string };
    try {
      payload = await this.tokenService.verifyRefreshToken(refreshToken);
    } catch (err: unknown) {
      this.logger.warn({ err }, 'Refresh token verification failed');
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    const isValid = await this.refreshTokenService.isValid(
      payload.sub,
      refreshToken,
    );
    if (!isValid) {
      // Токен криптографически валиден, но отсутствует в БД — уже отозван/ротирован.
      // Может значить replay украденного/старого refresh-токена, стоит алертить.
      this.logger.warn(
        { userId: payload.sub },
        'Refresh token rejected: not found or already revoked',
      );
      throw new UnauthorizedException('Refresh token revoked');
    }

    // Ротация: старый refresh-токен гасим, выдаём новую пару.
    await this.refreshTokenService.revoke(refreshToken);
    return this.issueTokens(payload.sub, payload.login);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) {
      await this.refreshTokenService.revoke(refreshToken);
    }
  }

  private async issueTokens(
    userId: string,
    login: string,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, login };
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken(payload),
      this.tokenService.signRefreshToken(payload),
    ]);

    await this.refreshTokenService.store(
      userId,
      refreshToken,
      new Date(Date.now() + this.tokenService.refreshExpiresInMs),
    );

    return { accessToken, refreshToken };
  }
}

interface UserRow {
  id: string;
  login: string;
  nickname: string;
  settings: unknown;
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    login: user.login,
    nickname: user.nickname,
    settings: readUserSettings(user.settings),
  };
}
