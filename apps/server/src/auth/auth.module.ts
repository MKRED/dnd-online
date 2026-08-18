import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';
import { TokenService } from './token.service';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokenService, RefreshTokenService, AuthGuard],
  exports: [AuthGuard, TokenService],
})
export class AuthModule {}
