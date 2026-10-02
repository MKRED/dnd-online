import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ApiTokensController } from './api-tokens.controller.js';
import { ApiTokensService } from './api-tokens.service.js';
import { SessionOrApiTokenGuard } from './session-or-api-token.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [ApiTokensController],
  providers: [ApiTokensService, SessionOrApiTokenGuard],
  exports: [ApiTokensService, SessionOrApiTokenGuard, AuthModule],
})
export class ApiTokensModule {}
