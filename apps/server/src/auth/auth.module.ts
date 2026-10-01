import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokenService, RefreshTokenService, AuthGuard],
  exports: [AuthGuard, TokenService],
})
export class AuthModule {}
