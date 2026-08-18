import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Response } from 'express';

export interface AccessTokenPayload {
  sub: string;
  login: string;
}

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

// Пустая строка/опечатка в .env не должны молча давать 0 или NaN — падаем на старте явно.
function parsePositiveSeconds(
  raw: string | undefined,
  fallback: number,
  envVarName: string,
): number {
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${envVarName} must be a positive number of seconds`);
  }
  return parsed;
}

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresInSec: number;
  private readonly refreshExpiresInSec: number;
  private readonly isProduction: boolean;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.accessSecret = configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    // Единые секунды для JWT exp и cookie maxAge — чтобы они не рассинхронизировались.
    this.accessExpiresInSec = parsePositiveSeconds(
      configService.get<string>('JWT_ACCESS_EXPIRES_SEC'),
      15 * 60,
      'JWT_ACCESS_EXPIRES_SEC',
    );
    this.refreshExpiresInSec = parsePositiveSeconds(
      configService.get<string>('JWT_REFRESH_EXPIRES_SEC'),
      30 * 24 * 60 * 60,
      'JWT_REFRESH_EXPIRES_SEC',
    );
    this.isProduction = configService.get('NODE_ENV') === 'production';
  }

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresInSec,
    });
  }

  signRefreshToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresInSec,
    });
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: this.accessSecret,
    });
  }

  verifyRefreshToken(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: this.refreshSecret,
    });
  }

  private cookieOptions(maxAgeMs: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeMs,
    };
  }

  setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    res.cookie(
      ACCESS_COOKIE,
      tokens.accessToken,
      this.cookieOptions(this.accessExpiresInSec * 1000),
    );
    res.cookie(
      REFRESH_COOKIE,
      tokens.refreshToken,
      this.cookieOptions(this.refreshExpiresInSec * 1000),
    );
  }

  get refreshExpiresInMs(): number {
    return this.refreshExpiresInSec * 1000;
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, this.cookieOptions(0));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions(0));
  }

  static readonly ACCESS_COOKIE = ACCESS_COOKIE;
  static readonly REFRESH_COOKIE = REFRESH_COOKIE;
}
