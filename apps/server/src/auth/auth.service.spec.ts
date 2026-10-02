import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type Mocked,
  type Mock,
} from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { PinoLogger } from 'nestjs-pino';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { TokenService } from './token.service.js';

const BCRYPT_ROUNDS_FOR_TESTS = 4;

describe('AuthService', () => {
  const storedUser = {
    id: 'u1',
    login: 'bob',
    nickname: 'Bob',
    passwordHash: '',
    createdAt: new Date(),
  };

  let usersService: Mocked<
    Pick<UsersService, 'findByLogin' | 'createUser' | 'findById'>
  >;
  let tokenService: Mocked<
    Pick<
      TokenService,
      'signAccessToken' | 'signRefreshToken' | 'verifyRefreshToken'
    >
  > & { refreshExpiresInMs: number };
  let refreshTokenService: Mocked<
    Pick<RefreshTokenService, 'store' | 'isValid' | 'revoke'>
  >;
  let logger: PinoLogger;
  let loggerWarn: Mock;
  let service: AuthService;

  beforeEach(async () => {
    storedUser.passwordHash = await bcrypt.hash(
      'correct-password',
      BCRYPT_ROUNDS_FOR_TESTS,
    );

    usersService = {
      findByLogin: vi.fn(),
      createUser: vi.fn(),
      findById: vi.fn(),
    };
    tokenService = {
      signAccessToken: vi.fn().mockResolvedValue('access-jwt'),
      signRefreshToken: vi.fn().mockResolvedValue('refresh-jwt'),
      verifyRefreshToken: vi.fn(),
      refreshExpiresInMs: 1000,
    };
    refreshTokenService = {
      store: vi.fn(),
      isValid: vi.fn(),
      revoke: vi.fn(),
    };
    loggerWarn = vi.fn();
    logger = {
      warn: loggerWarn,
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as PinoLogger;

    service = new AuthService(
      usersService as unknown as UsersService,
      tokenService as unknown as TokenService,
      refreshTokenService as unknown as RefreshTokenService,
      logger,
    );
  });

  it('registers a new user and issues a token pair', async () => {
    usersService.findByLogin.mockResolvedValue(undefined);
    usersService.createUser.mockResolvedValue(storedUser);

    const result = await service.register({
      login: 'bob',
      nickname: 'Bob',
      password: 'x',
    });

    expect(result.user).toEqual({ id: 'u1', login: 'bob', nickname: 'Bob' });
    expect(result.tokens).toEqual({
      accessToken: 'access-jwt',
      refreshToken: 'refresh-jwt',
    });
    expect(refreshTokenService.store).toHaveBeenCalledWith(
      'u1',
      'refresh-jwt',
      expect.any(Date),
    );
  });

  it('rejects registration when the login is already taken', async () => {
    usersService.findByLogin.mockResolvedValue(storedUser);

    await expect(
      service.register({ login: 'bob', nickname: 'Bob', password: 'x' }),
    ).rejects.toThrow(ConflictException);
    expect(usersService.createUser).not.toHaveBeenCalled();
  });

  it('logs in with correct credentials', async () => {
    usersService.findByLogin.mockResolvedValue(storedUser);

    const result = await service.login({
      login: 'bob',
      password: 'correct-password',
    });

    expect(result.tokens).toEqual({
      accessToken: 'access-jwt',
      refreshToken: 'refresh-jwt',
    });
  });

  it('rejects login with a wrong password', async () => {
    usersService.findByLogin.mockResolvedValue(storedUser);

    await expect(
      service.login({ login: 'bob', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects login for an unknown login', async () => {
    usersService.findByLogin.mockResolvedValue(undefined);

    await expect(
      service.login({ login: 'ghost', password: 'whatever' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rotates the refresh token on a valid refresh', async () => {
    tokenService.verifyRefreshToken.mockResolvedValue({
      sub: 'u1',
      login: 'bob',
    });
    refreshTokenService.isValid.mockResolvedValue(true);

    const tokens = await service.refresh('old-refresh-jwt');

    expect(refreshTokenService.revoke).toHaveBeenCalledWith('old-refresh-jwt');
    expect(tokens).toEqual({
      accessToken: 'access-jwt',
      refreshToken: 'refresh-jwt',
    });
  });

  it('rejects refresh when the token is no longer stored (already revoked)', async () => {
    tokenService.verifyRefreshToken.mockResolvedValue({
      sub: 'u1',
      login: 'bob',
    });
    refreshTokenService.isValid.mockResolvedValue(false);

    await expect(service.refresh('reused-refresh-jwt')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(refreshTokenService.revoke).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalled();
  });

  it('rejects refresh when the JWT itself fails verification', async () => {
    tokenService.verifyRefreshToken.mockRejectedValue(
      new Error('signature mismatch'),
    );

    await expect(service.refresh('bogus')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(loggerWarn).toHaveBeenCalled();
  });

  it('revokes the refresh token on logout when present', async () => {
    await service.logout('some-refresh-jwt');
    expect(refreshTokenService.revoke).toHaveBeenCalledWith('some-refresh-jwt');
  });

  it('does nothing on logout when no refresh token is present', async () => {
    await service.logout(undefined);
    expect(refreshTokenService.revoke).not.toHaveBeenCalled();
  });
});
