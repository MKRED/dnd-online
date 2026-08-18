import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AccessTokenPayload, TokenService } from './token.service';

export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    @InjectPinoLogger(AuthGuard.name) private readonly logger: PinoLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = (request.cookies as Record<string, string> | undefined)?.[
      TokenService.ACCESS_COOKIE
    ];
    if (!token) {
      throw new UnauthorizedException('Access token missing');
    }

    try {
      request.user = await this.tokenService.verifyAccessToken(token);
      return true;
    } catch (err: unknown) {
      // Ожидаемо часто из-за истечения access-токена (15 мин) — debug, а не warn, чтобы не шуметь.
      this.logger.debug({ err }, 'Access token verification failed');
      throw new UnauthorizedException('Access token invalid or expired');
    }
  }
}
