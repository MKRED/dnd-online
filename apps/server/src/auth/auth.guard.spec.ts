import { describe, it, expect, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import { AuthGuard } from './auth.guard.js';
import { AccessTokenPayload, TokenService } from './token.service.js';

function makeContext(cookies: Record<string, string> | undefined) {
  const request: { cookies?: Record<string, string>; user?: unknown } = {
    cookies,
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function makeLogger() {
  const debug = vi.fn();
  return { logger: { debug } as unknown as PinoLogger, debug };
}

describe('AuthGuard', () => {
  it('throws when the access token cookie is missing', async () => {
    const tokenService = {
      verifyAccessToken: vi.fn(),
    } as unknown as TokenService;
    const guard = new AuthGuard(tokenService, makeLogger().logger);
    const { context } = makeContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the payload to the request and allows access on a valid token', async () => {
    const payload: AccessTokenPayload = { sub: 'u1', login: 'bob' };
    const tokenService = {
      verifyAccessToken: vi.fn().mockResolvedValue(payload),
    } as unknown as TokenService;
    const guard = new AuthGuard(tokenService, makeLogger().logger);
    const { context, request } = makeContext({ access_token: 'valid' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });

  it('throws and logs when token verification fails', async () => {
    const tokenService = {
      verifyAccessToken: vi.fn().mockRejectedValue(new Error('bad token')),
    } as unknown as TokenService;
    const { logger, debug } = makeLogger();
    const guard = new AuthGuard(tokenService, logger);
    const { context } = makeContext({ access_token: 'bad' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(debug).toHaveBeenCalled();
  });
});
