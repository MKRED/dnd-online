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
import { AuthGuard } from '../auth/auth.guard.js';
import { MapNameDto } from './dto/map-name.dto.js';
import { MapsService } from './maps.service.js';

@Controller('maps')
@UseGuards(AuthGuard)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: MapNameDto) {
    return this.mapsService.create(req.user.sub, dto.name);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.mapsService.findAllForOwner(req.user.sub);
  }

  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mapsService.findOneForOwner(req.user.sub, id);
  }

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
