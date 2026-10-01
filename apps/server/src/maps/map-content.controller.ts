import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { ApplyOpsDto } from './dto/apply-ops.dto.js';
import { SliceQueryDto } from './dto/slice-query.dto.js';
import { MapEditService } from './map-edit.service.js';
import { MapReadService } from './map-read.service.js';

// Блоки карты: чтение (рендер, нейросеть) и правки через операции.
@Controller('maps/:id')
@UseGuards(AuthGuard)
export class MapContentController {
  constructor(
    private readonly editService: MapEditService,
    private readonly readService: MapReadService,
  ) {}

  @Get('chunks')
  chunks(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.readService.getChunks(req.user.sub, id);
  }

  @Get('summary')
  summary(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.readService.getSummary(req.user.sub, id);
  }

  @Get('slice')
  slice(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SliceQueryDto,
  ) {
    return this.readService.getSlice(req.user.sub, id, query);
  }

  @Post('ops')
  @HttpCode(200)
  applyOps(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyOpsDto,
  ) {
    return this.editService.applyBatch(req.user.sub, id, dto.ops);
  }

  @Post('undo')
  @HttpCode(200)
  undo(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.editService.undo(req.user.sub, id);
  }

  @Post('redo')
  @HttpCode(200)
  redo(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.editService.redo(req.user.sub, id);
  }
}
