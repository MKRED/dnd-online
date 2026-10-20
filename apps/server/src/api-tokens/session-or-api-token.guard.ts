import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { ALLOW_API_TOKEN } from './allow-api-token.decorator.js';
import { looksLikeApiToken } from './api-token.format.js';
import { ApiTokensService } from './api-tokens.service.js';

// Для маршрутов, доступных внешним клиентам (MCP-серверы): либо обычная cookie-сессия
// браузера, либо заголовок «Authorization: Bearer dnd_…». Токену открыты только
// обработчики с @AllowApiToken(): удаление, публикация и аккаунт остаются за
// интерфейсом. Управление самими токенами под этим guard не стоит: утёкший токен не
// должен уметь выпускать новые.
@Injectable()
export class SessionOrApiTokenGuard implements CanActivate {
  constructor(
    private readonly sessionGuard: AuthGuard,
    private readonly apiTokensService: ApiTokensService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header) return this.sessionGuard.canActivate(context);

    // С заголовком в сессию не откатываемся: иначе браузерная cookie прятала бы ошибку
    // в токене.
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token || !looksLikeApiToken(token)) {
      throw new UnauthorizedException('Неверный заголовок Authorization');
    }
    const user = await this.apiTokensService.verify(token);
    if (!user) throw new UnauthorizedException('API-токен недействителен');

    const allowed = this.reflector.get<boolean | undefined>(
      ALLOW_API_TOKEN,
      context.getHandler(),
    );
    if (!allowed) {
      throw new ForbiddenException(
        'Через API-токен это сделать нельзя — сделайте это в интерфейсе',
      );
    }
    request.user = user;
    request.viaApiToken = true;
    return true;
  }
}
