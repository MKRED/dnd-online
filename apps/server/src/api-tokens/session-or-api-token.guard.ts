import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { looksLikeApiToken } from './api-token.format.js';
import { ApiTokensService } from './api-tokens.service.js';

// Для маршрутов, доступных внешним клиентам (MCP-сервер карты): либо обычная
// cookie-сессия браузера, либо заголовок «Authorization: Bearer dnd_…».
// Управление самими токенами под этим guard не стоит: утёкший токен не должен
// уметь выпускать новые.
@Injectable()
export class SessionOrApiTokenGuard implements CanActivate {
  constructor(
    private readonly sessionGuard: AuthGuard,
    private readonly apiTokensService: ApiTokensService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header) return this.sessionGuard.canActivate(context);

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token || !looksLikeApiToken(token)) {
      throw new UnauthorizedException('Неверный заголовок Authorization');
    }
    const user = await this.apiTokensService.verify(token);
    if (!user) throw new UnauthorizedException('API-токен недействителен');
    request.user = user;
    return true;
  }
}
