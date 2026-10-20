import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import { CreateMapDto } from './dto/create-map.dto.js';
import { MapNameDto } from './dto/map-name.dto.js';
import { MapsService } from './maps.service.js';
import { AllowApiToken } from '../api-tokens/allow-api-token.decorator.js';

@Controller('maps')
@UseGuards(SessionOrApiTokenGuard)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @AllowApiToken()
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateMapDto) {
    return this.mapsService.create(req.user.sub, dto);
  }

  @AllowApiToken()
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.mapsService.findAllForOwner(req.user.sub);
  }

  @AllowApiToken()
  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mapsService.findOneForOwner(req.user.sub, id);
  }

  @AllowApiToken()
  @Patch(':id')
  rename(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MapNameDto,
  ) {
    return this.mapsService.rename(req.user.sub, id, dto.name);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mapsService.remove(req.user.sub, id);
  }
}
