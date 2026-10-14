import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { PinoLogger } from 'nestjs-pino';
import { LolkaOAuthError, LolkaOAuthService } from './lolka-oauth.service.js';
import { codeChallenge } from './pkce.js';

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as unknown as PinoLogger;

function makeService(env: Record<string, string> = {}): LolkaOAuthService {
  const values: Record<string, string> = {
    LOLKA_CLIENT_ID: 'la_test',
    LOLKA_CLIENT_SECRET: 'secret',
    LOLKA_REDIRECT_URI: 'https://dnd.example/api/auth/lolka/callback',
    ...env,
  };
  const config = {
    get: (key: string) => values[key] || undefined,
    getOrThrow: (key: string) => {
      if (!values[key]) throw new Error(`missing ${key}`);
      return values[key];
    },
  } as unknown as ConfigService;
  return new LolkaOAuthService(config, logger);
}

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LolkaOAuthService', () => {
  it('is disabled without LOLKA_CLIENT_ID', () => {
    expect(makeService({ LOLKA_CLIENT_ID: '' }).enabled).toBe(false);
  });

  it('builds the authorize URL with PKCE S256', () => {
    const url = new URL(makeService().authorizeUrl('st', 'ch'));
    expect(url.origin + url.pathname).toBe(
      'https://lolka.aoshi.ru/oauth/authorize',
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'la_test',
      redirect_uri: 'https://dnd.example/api/auth/lolka/callback',
      state: 'st',
      code_challenge: 'ch',
      code_challenge_method: 'S256',
    });
  });

  it('computes the challenge as unpadded base64url sha256', () => {
    // SHA-256("abc") — известный тестовый вектор FIPS 180-2.
    const sha256Abc =
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    expect(codeChallenge('abc')).toBe(
      Buffer.from(sha256Abc, 'hex')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''),
    );
    expect(codeChallenge('abc')).not.toMatch(/[=+/]/);
  });

  it('exchanges the code with a form body and returns the access token', async () => {
    const fetchMock = mockFetch(200, {
      access_token: 'tok',
      token_type: 'Bearer',
      expires_in: 3600,
    });
    await expect(makeService().exchangeCode('c1', 'v1')).resolves.toBe('tok');

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://lolka.aoshi.ru/oauth/token');
    expect(init.method).toBe('POST');
    expect(Object.fromEntries(init.body as URLSearchParams)).toMatchObject({
      grant_type: 'authorization_code',
      code: 'c1',
      code_verifier: 'v1',
      client_secret: 'secret',
    });
  });

  it('maps a 429 from lolka to rate_limited and other errors to failed', async () => {
    mockFetch(429, {});
    await expect(makeService().exchangeCode('c', 'v')).rejects.toMatchObject({
      code: 'rate_limited',
    });
    mockFetch(400, { error: 'invalid_grant' });
    await expect(makeService().exchangeCode('c', 'v')).rejects.toMatchObject({
      code: 'failed',
    });
  });

  it('reads sub and nickname from userinfo', async () => {
    const fetchMock = mockFetch(200, {
      sub: 'u-42',
      nickname: 'Арвен',
      avatar_url: null,
      is_adult: true,
    });
    await expect(makeService().fetchUserInfo('tok')).resolves.toEqual({
      sub: 'u-42',
      nickname: 'Арвен',
    });
    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it('rejects userinfo without sub', async () => {
    mockFetch(200, { nickname: 'x' });
    await expect(makeService().fetchUserInfo('tok')).rejects.toBeInstanceOf(
      LolkaOAuthError,
    );
  });

  it('turns a network failure into failed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
    await expect(makeService().fetchUserInfo('tok')).rejects.toMatchObject({
      code: 'failed',
    });
  });
});
