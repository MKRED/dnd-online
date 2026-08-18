import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = {
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    ...overrides,
  };
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      const value = values[key];
      if (value === undefined) throw new Error(`Missing ${key}`);
      return value;
    },
  } as unknown as ConfigService;
}

describe('TokenService', () => {
  it('signs and verifies an access token round-trip', async () => {
    const service = new TokenService(new JwtService(), makeConfig());
    const token = await service.signAccessToken({ sub: 'u1', login: 'bob' });
    const payload = await service.verifyAccessToken(token);
    expect(payload).toEqual(
      expect.objectContaining({ sub: 'u1', login: 'bob' }),
    );
  });

  it('rejects an access token when verified against the refresh secret path', async () => {
    const service = new TokenService(new JwtService(), makeConfig());
    const refreshToken = await service.signRefreshToken({
      sub: 'u1',
      login: 'bob',
    });
    await expect(service.verifyAccessToken(refreshToken)).rejects.toThrow();
  });

  it('falls back to defaults when expiry env vars are unset', () => {
    const service = new TokenService(new JwtService(), makeConfig());
    expect(service.refreshExpiresInMs).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('throws on startup for a non-positive expiry override', () => {
    expect(
      () =>
        new TokenService(
          new JwtService(),
          makeConfig({ JWT_ACCESS_EXPIRES_SEC: '0' }),
        ),
    ).toThrow();
  });

  it('throws on startup for a non-numeric expiry override', () => {
    expect(
      () =>
        new TokenService(
          new JwtService(),
          makeConfig({ JWT_REFRESH_EXPIRES_SEC: 'not-a-number' }),
        ),
    ).toThrow();
  });
});
