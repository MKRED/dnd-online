import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { PinoLogger } from 'nestjs-pino';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';
import { TokenService } from './token.service';

const BCRYPT_ROUNDS_FOR_TESTS = 4;

describe('AuthService', () => {
  const storedUser = {
    id: 'u1',
    login: 'bob',
    nickname: 'Bob',
    passwordHash: '',
  };

  let usersService: jest.Mocked<
    Pick<UsersService, 'findByLogin' | 'createUser' | 'findById'>
  >;
  let tokenService: jest.Mocked<
    Pick<
      TokenService,
      'signAccessToken' | 'signRefreshToken' | 'verifyRefreshToken'
    >
  > & { refreshExpiresInMs: number };
  let refreshTokenService: jest.Mocked<
    Pick<RefreshTokenService, 'store' | 'isValid' | 'revoke'>
  >;
  let logger: PinoLogger;
  let loggerWarn: jest.Mock;
  let service: AuthService;

  beforeEach(async () => {
    storedUser.passwordHash = await bcrypt.hash(
      'correct-password',
      BCRYPT_ROUNDS_FOR_TESTS,
    );

    usersService = {
      findByLogin: jest.fn(),
      createUser: jest.fn(),
      findById: jest.fn(),
    };
    tokenService = {
      signAccessToken: jest.fn().mockResolvedValue('access-jwt'),
      signRefreshToken: jest.fn().mockResolvedValue('refresh-jwt'),
      verifyRefreshToken: jest.fn(),
      refreshExpiresInMs: 1000,
    };
    refreshTokenService = {
      store: jest.fn(),
      isValid: jest.fn(),
      revoke: jest.fn(),
    };
    loggerWarn = jest.fn();
    logger = {
      warn: loggerWarn,
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
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
