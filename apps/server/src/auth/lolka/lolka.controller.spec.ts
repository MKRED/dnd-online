import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { PinoLogger } from 'nestjs-pino';
import type { UserIdentitiesService } from '../../users/user-identities.service.js';
import type { AuthService } from '../auth.service.js';
import type { TokenService } from '../token.service.js';
import { LolkaController } from './lolka.controller.js';
import {
  LolkaOAuthError,
  type LolkaOAuthService,
} from './lolka-oauth.service.js';

const user = { id: 'u1', login: 'lolka_ab12cd34', nickname: 'Арвен' };

function fakeRes() {
  const cookies: Record<string, string> = {};
  const res = {
    cookie: vi.fn((name: string, value: string, _options?: object) => {
      void _options;
      cookies[name] = value;
    }),
    clearCookie: vi.fn(),
    redirect: vi.fn(),
  };
  return { res, cookies, asRes: res as unknown as Response };
}

function reqWith(cookies: Record<string, string>): Request {
  return { cookies } as unknown as Request;
}

describe('LolkaController', () => {
  let lolka: {
    enabled: boolean;
    authorizeUrl: ReturnType<typeof vi.fn>;
    exchangeCode: ReturnType<typeof vi.fn>;
    fetchUserInfo: ReturnType<typeof vi.fn>;
  };
  let identities: { findOrCreateUser: ReturnType<typeof vi.fn> };
  let setAuthCookies: ReturnType<typeof vi.fn>;
  let controller: LolkaController;

  beforeEach(() => {
    lolka = {
      enabled: true,
      authorizeUrl: vi.fn(
        (state: string, challenge: string) =>
          `https://lolka.test/oauth/authorize?state=${state}&code_challenge=${challenge}`,
      ),
      exchangeCode: vi.fn().mockResolvedValue('lolka-token'),
      fetchUserInfo: vi
        .fn()
        .mockResolvedValue({ sub: 's-1', nickname: 'Арвен' }),
    };
    identities = {
      findOrCreateUser: vi.fn().mockResolvedValue({ user, created: true }),
    };
    setAuthCookies = vi.fn();
    controller = new LolkaController(
      lolka as unknown as LolkaOAuthService,
      identities as unknown as UserIdentitiesService,
      {
        signIn: vi.fn().mockResolvedValue({
          user,
          tokens: { accessToken: 'a', refreshToken: 'r' },
        }),
      } as unknown as AuthService,
      { setAuthCookies } as unknown as TokenService,
      { get: () => 'test' } as unknown as ConfigService,
      { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as PinoLogger,
    );
  });

  // Уход на лольку: возвращает cookie, с которой потом придёт callback.
  function start(): Record<string, string> {
    const { cookies, asRes } = fakeRes();
    controller.start(asRes);
    return cookies;
  }

  function stateFrom(cookies: Record<string, string>): string {
    const pending = JSON.parse(
      Buffer.from(cookies.lolka_oauth, 'base64url').toString('utf8'),
    ) as { state: string };
    return pending.state;
  }

  it('start remembers state and verifier in a cookie and redirects to lolka', () => {
    const { res, cookies, asRes } = fakeRes();
    controller.start(asRes);

    const state = stateFrom(cookies);
    expect(lolka.authorizeUrl).toHaveBeenCalledWith(state, expect.any(String));
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining(`state=${state}`),
    );
    expect(res.cookie.mock.calls[0][2]).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/auth/lolka',
    });
  });

  it('callback with a matching state signs the user in', async () => {
    const cookies = start();
    const { res, asRes } = fakeRes();
    await controller.callback(
      { code: 'c1', state: stateFrom(cookies) },
      reqWith(cookies),
      asRes,
    );

    expect(lolka.exchangeCode).toHaveBeenCalledWith('c1', expect.any(String));
    expect(identities.findOrCreateUser).toHaveBeenCalledWith({
      provider: 'lolka',
      subject: 's-1',
      nickname: 'Арвен',
    });
    expect(setAuthCookies).toHaveBeenCalledWith(asRes, {
      accessToken: 'a',
      refreshToken: 'r',
    });
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it.each([
    [
      'a foreign state',
      (c: Record<string, string>) => ({
        query: { code: 'c', state: 'other' },
        cookies: c,
      }),
    ],
    [
      'no cookie',
      (c: Record<string, string>) => ({
        query: { code: 'c', state: stateFrom(c) },
        cookies: {},
      }),
    ],
    [
      'a broken cookie',
      () => ({
        query: { code: 'c', state: 'x' },
        cookies: { lolka_oauth: '%%%' },
      }),
    ],
  ])('callback with %s is refused without calling lolka', async (_, make) => {
    const { query, cookies } = make(start());
    const { res, asRes } = fakeRes();
    await controller.callback(query, reqWith(cookies), asRes);

    expect(lolka.exchangeCode).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/login?lolkaError=state');
  });

  it('callback after the user declined shows denied', async () => {
    const { res, asRes } = fakeRes();
    await controller.callback(
      { error: 'access_denied' },
      reqWith(start()),
      asRes,
    );
    expect(res.redirect).toHaveBeenCalledWith('/login?lolkaError=denied');
  });

  it('callback passes the lolka error code through', async () => {
    lolka.exchangeCode.mockRejectedValue(
      new LolkaOAuthError('rate_limited', '429'),
    );
    const cookies = start();
    const { res, asRes } = fakeRes();
    await controller.callback(
      { code: 'c', state: stateFrom(cookies) },
      reqWith(cookies),
      asRes,
    );
    expect(res.redirect).toHaveBeenCalledWith('/login?lolkaError=rate_limited');
    expect(setAuthCookies).not.toHaveBeenCalled();
  });

  it('callback turns an unexpected error into failed', async () => {
    identities.findOrCreateUser.mockRejectedValue(new Error('db down'));
    const cookies = start();
    const { res, asRes } = fakeRes();
    await controller.callback(
      { code: 'c', state: stateFrom(cookies) },
      reqWith(cookies),
      asRes,
    );
    expect(res.redirect).toHaveBeenCalledWith('/login?lolkaError=failed');
  });

  it('routes are 404 while lolka is not configured', async () => {
    lolka.enabled = false;
    expect(() => controller.start(fakeRes().asRes)).toThrow(NotFoundException);
    await expect(
      controller.callback({}, reqWith({}), fakeRes().asRes),
    ).rejects.toThrow(NotFoundException);
  });
});
