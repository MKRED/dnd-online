import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const REQUEST_TIMEOUT_MS = 10_000;

export interface LolkaUserInfo {
  // Постоянный id пользователя, свой для каждого сайта.
  sub: string;
  nickname: string;
}

// Причина отказа — по ней страница входа выбирает текст.
export type LolkaErrorCode = 'failed' | 'rate_limited';

export class LolkaOAuthError extends Error {
  constructor(
    readonly code: LolkaErrorCode,
    message: string,
  ) {
    super(message);
  }
}

interface LolkaConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
}

// OAuth 2.0 Authorization Code + PKCE лольки: https://lolka.aoshi.ru/docs/login.html.
// Обмен кода и секрет — только здесь, на сервере. Токен лольки нужен один раз, ради
// userinfo, и не хранится.
@Injectable()
export class LolkaOAuthService {
  private readonly config: LolkaConfig | null;

  constructor(
    configService: ConfigService,
    @InjectPinoLogger(LolkaOAuthService.name)
    private readonly logger: PinoLogger,
  ) {
    // Без LOLKA_CLIENT_ID вход через лольку выключен (dev, тесты); с ним остальное обязательно.
    const clientId = configService.get<string>('LOLKA_CLIENT_ID');
    this.config = clientId
      ? {
          clientId,
          clientSecret: configService.getOrThrow<string>('LOLKA_CLIENT_SECRET'),
          redirectUri: configService.getOrThrow<string>('LOLKA_REDIRECT_URI'),
          baseUrl:
            configService.get<string>('LOLKA_BASE_URL') ??
            'https://lolka.aoshi.ru',
        }
      : null;
  }

  get enabled(): boolean {
    return this.config !== null;
  }

  authorizeUrl(state: string, challenge: string): string {
    const config = this.requireConfig();
    const url = new URL('/oauth/authorize', config.baseUrl);
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();
    return url.toString();
  }

  async exchangeCode(code: string, verifier: string): Promise<string> {
    const config = this.requireConfig();
    const body = await this.call<{ access_token?: unknown }>('token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code_verifier: verifier,
      }),
    });
    if (typeof body.access_token !== 'string') {
      throw new LolkaOAuthError(
        'failed',
        'Lolka token response has no access_token',
      );
    }
    return body.access_token;
  }

  async fetchUserInfo(accessToken: string): Promise<LolkaUserInfo> {
    const body = await this.call<{ sub?: unknown; nickname?: unknown }>(
      'userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (typeof body.sub !== 'string' || body.sub === '') {
      throw new LolkaOAuthError('failed', 'Lolka userinfo has no sub');
    }
    const nickname = typeof body.nickname === 'string' ? body.nickname : '';
    return { sub: body.sub, nickname };
  }

  // Запрос к /oauth/<endpoint> с таймаутом и логами. Тело ответа в лог не пишем:
  // в нём токен; код ошибки лольки (`error`) — пишем.
  private async call<T>(endpoint: string, init: RequestInit): Promise<T> {
    const url = new URL(`/oauth/${endpoint}`, this.requireConfig().baseUrl);
    const t0 = Date.now();
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.error(
        { err, endpoint, durationMs: Date.now() - t0 },
        'Lolka request failed',
      );
      throw new LolkaOAuthError('failed', `Lolka ${endpoint} request failed`);
    }
    const body = (await res.json().catch(() => ({}))) as T & {
      error?: unknown;
    };
    const durationMs = Date.now() - t0;
    if (!res.ok) {
      this.logger.warn(
        { endpoint, status: res.status, error: body.error, durationMs },
        'Lolka request rejected',
      );
      throw new LolkaOAuthError(
        res.status === 429 ? 'rate_limited' : 'failed',
        `Lolka ${endpoint} responded ${res.status}`,
      );
    }
    this.logger.info({ endpoint, durationMs }, 'Lolka request completed');
    return body;
  }

  private requireConfig(): LolkaConfig {
    if (!this.config) throw new Error('Lolka sign-in is not configured');
    return this.config;
  }
}
