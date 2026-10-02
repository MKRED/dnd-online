import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthGuard } from '../auth/auth.guard.js';
import type { ApiTokensService } from './api-tokens.service.js';
import { SessionOrApiTokenGuard } from './session-or-api-token.guard.js';

function makeContext(authorization?: string) {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function makeGuard(verified: { sub: string; login: string } | null = null) {
  const sessionGuard = { canActivate: vi.fn().mockResolvedValue(true) };
  const apiTokensService = { verify: vi.fn().mockResolvedValue(verified) };
  const guard = new SessionOrApiTokenGuard(
    sessionGuard as unknown as AuthGuard,
    apiTokensService as unknown as ApiTokensService,
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
    expect(sessionGuard.canActivate).not.toHaveBeenCalled();
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
