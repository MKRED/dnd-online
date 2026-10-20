import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { LolkaOAuthService } from './lolka/lolka-oauth.service.js';
import { LolkaController } from './lolka/lolka.controller.js';
import { ProfileController } from './profile/profile.controller.js';
import { ProfileSettingsController } from './profile/profile-settings.controller.js';
import { ProfileService } from './profile/profile.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({}),
    // Лимит по умолчанию для всего AuthController (refresh, me, logout): с запасом,
    // чтобы не мешать обычной работе. Строгие лимиты — точечно на login/register.
    // Хранилище in-memory: инстанс один, при рестарте счётчики сбрасываются — это ок.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
      // Текст уходит в UI как есть (LoginPage показывает message из тела ответа).
      errorMessage: 'Слишком много попыток, попробуйте позже',
    }),
  ],
  controllers: [
    AuthController,
    LolkaController,
    ProfileController,
    ProfileSettingsController,
  ],
  providers: [
    AuthService,
    TokenService,
    RefreshTokenService,
    AuthGuard,
    LolkaOAuthService,
    ProfileService,
  ],
  exports: [AuthGuard, TokenService],
})
export class AuthModule {}
