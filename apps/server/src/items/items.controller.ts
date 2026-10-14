import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { ItemDto } from './dto/item.dto.js';
import { ListItemsQueryDto } from './dto/list-items-query.dto.js';
import { ItemsService } from './items.service.js';

@Controller('items')
@UseGuards(AuthGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: ItemDto) {
    return this.itemsService.create(req.user.sub, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: ListItemsQueryDto) {
    return this.itemsService.list(req.user.sub, query.scope);
  }

  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.itemsService.findOne(req.user.sub, id);
  }

  @Put(':id')
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ItemDto,
  ) {
    return this.itemsService.replace(req.user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.itemsService.remove(req.user.sub, id);
  }
}
