import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { AuthGuard } from '../auth/auth.guard.js';
import { AllowApiToken } from './allow-api-token.decorator.js';
import type { ApiTokensService } from './api-tokens.service.js';
import { SessionOrApiTokenGuard } from './session-or-api-token.guard.js';

class Routes {
  @AllowApiToken()
  open(this: void) {}

  closed(this: void) {}
}

function makeContext(authorization?: string, handler = Routes.prototype.open) {
  const request: {
    headers: Record<string, string>;
    user?: unknown;
    viaApiToken?: boolean;
  } = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
  } as unknown as ExecutionContext;
  return { context, request };
}

function makeGuard(verified: { sub: string; login: string } | null = null) {
  const sessionGuard = { canActivate: vi.fn().mockResolvedValue(true) };
  const apiTokensService = { verify: vi.fn().mockResolvedValue(verified) };
  const guard = new SessionOrApiTokenGuard(
    sessionGuard as unknown as AuthGuard,
    apiTokensService as unknown as ApiTokensService,
    new Reflector(),
  );
  return { guard, sessionGuard, apiTokensService };
}

describe('SessionOrApiTokenGuard', () => {
  it('без заголовка Authorization проверяет cookie-сессию', async () => {
    const { guard, sessionGuard, apiTokensService } = makeGuard();
    const { context } = makeContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(sessionGuard.canActivate).toHaveBeenCalledWith(context);
    expect(apiTokensService.verify).not.toHaveBeenCalled();
  });

  it('пускает по действующему API-токену и кладёт владельца в request.user', async () => {
    const owner = { sub: 'u1', login: 'gm' };
    const { guard, sessionGuard } = makeGuard(owner);
    const { context, request } = makeContext('Bearer dnd_abc');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(owner);
    expect(request.viaApiToken).toBe(true);
    expect(sessionGuard.canActivate).not.toHaveBeenCalled();
  });

  it('не пускает токен к обработчику без @AllowApiToken()', async () => {
    const { guard } = makeGuard({ sub: 'u1', login: 'gm' });
    const { context, request } = makeContext(
      'Bearer dnd_abc',
      Routes.prototype.closed,
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(request.user).toBeUndefined();
  });

  it('сессию пускает и к обработчику без @AllowApiToken()', async () => {
    const { guard, sessionGuard } = makeGuard();
    const { context } = makeContext(undefined, Routes.prototype.closed);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(sessionGuard.canActivate).toHaveBeenCalledWith(context);
  });

  it('неизвестный токен у закрытого обработчика — 401, а не 403', async () => {
    const { guard } = makeGuard(null);
    const { context } = makeContext('Bearer dnd_x', Routes.prototype.closed);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it.each([
    ['неизвестный токен', 'Bearer dnd_unknown'],
    ['другая схема', 'Basic dnd_abc'],
    ['не наш формат токена', 'Bearer eyJhbGciOi'],
  ])('отказывает: %s', async (_, header) => {
    const { guard } = makeGuard(null);
    const { context } = makeContext(header);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
