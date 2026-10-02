import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { ApiTokensService } from './api-tokens.service.js';
import { CreateApiTokenDto } from './dto/create-api-token.dto.js';

// Только cookie-сессия (AuthGuard), не SessionOrApiTokenGuard — см. комментарий в guard.
@Controller('api-tokens')
@UseGuards(AuthGuard)
export class ApiTokensController {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.apiTokensService.listForUser(req.user.sub);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateApiTokenDto) {
    return this.apiTokensService.create(req.user.sub, dto.name);
  }

  @Delete(':id')
  @HttpCode(204)
  revoke(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.apiTokensService.revoke(req.user.sub, id);
  }
}
