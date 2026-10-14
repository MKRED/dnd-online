import {
  Controller,
  Get,
  NotFoundException,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { safeReturnPath } from 'shared';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserIdentitiesService } from '../../users/user-identities.service.js';
import { AuthService } from '../auth.service.js';
import { TokenService } from '../token.service.js';
import { LolkaOAuthError, LolkaOAuthService } from './lolka-oauth.service.js';
import { setPendingCookie, takePendingCookie } from './lolka-state-cookie.js';
import { codeChallenge, randomUrlToken } from './pkce.js';

// Коды для страницы входа (`/login?lolkaError=`), тексты — там.
type SignInError = 'denied' | 'state' | 'failed' | 'rate_limited';

interface CallbackQuery {
  code?: string;
  state?: string;
  error?: string;
}

// Оба маршрута — полные переходы браузера, а не fetch: ответ всегда редирект.
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller('auth/lolka')
export class LolkaController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly lolka: LolkaOAuthService,
    private readonly identities: UserIdentitiesService,
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    configService: ConfigService,
    @InjectPinoLogger(LolkaController.name) private readonly logger: PinoLogger,
  ) {
    this.secureCookies = configService.get('NODE_ENV') === 'production';
  }

  // next — страница, куда вернуть после входа (например, ссылка на персонажа).
  @Get('start')
  start(@Query('next') next: unknown, @Res() res: Response): void {
    this.requireEnabled();
    const pending = {
      state: randomUrlToken(),
      verifier: randomUrlToken(),
      next: safeReturnPath(next) ?? undefined,
    };
    setPendingCookie(res, pending, this.secureCookies);
    res.redirect(
      this.lolka.authorizeUrl(pending.state, codeChallenge(pending.verifier)),
    );
  }

  @Get('callback')
  async callback(
    @Query() query: CallbackQuery,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    this.requireEnabled();
    const pending = takePendingCookie(req, res, this.secureCookies);
    if (query.error) {
      this.logger.info({ error: query.error }, 'Lolka sign-in declined');
      return this.fail(
        res,
        query.error === 'access_denied' ? 'denied' : 'failed',
        pending?.next,
      );
    }
    // state из адреса должен совпасть с тем, что мы сами положили в cookie перед уходом:
    // иначе это чужой код, подсунутый по ссылке (CSRF), или cookie истекла.
    if (!pending || !query.code || query.state !== pending.state) {
      this.logger.warn(
        { hasCookie: Boolean(pending) },
        'Lolka sign-in state mismatch',
      );
      return this.fail(res, 'state', pending?.next);
    }

    try {
      const accessToken = await this.lolka.exchangeCode(
        query.code,
        pending.verifier,
      );
      const info = await this.lolka.fetchUserInfo(accessToken);
      const { user, created } = await this.identities.findOrCreateUser({
        provider: 'lolka',
        subject: info.sub,
        nickname: info.nickname,
      });
      const { tokens } = await this.authService.signIn(user);
      this.tokenService.setAuthCookies(res, tokens);
      this.logger.info({ userId: user.id, created }, 'Signed in through lolka');
      res.redirect(pending.next ?? '/');
    } catch (err) {
      if (err instanceof LolkaOAuthError) {
        return this.fail(res, err.code, pending.next);
      }
      this.logger.error({ err }, 'Lolka sign-in failed');
      this.fail(res, 'failed', pending.next);
    }
  }

  // Страница входа сохраняет next: после второй попытки человек всё равно попадёт туда, куда шёл.
  private fail(res: Response, error: SignInError, next?: string): void {
    const query = new URLSearchParams({ lolkaError: error });
    if (next) query.set('next', next);
    res.redirect(`/login?${query}`);
  }

  // Без настроек лольки маршрутов как будто нет — кнопку веб тогда и не показывает.
  private requireEnabled(): void {
    if (!this.lolka.enabled) throw new NotFoundException();
  }
}
