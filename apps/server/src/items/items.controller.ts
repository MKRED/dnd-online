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
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import { ItemDto } from './dto/item.dto.js';
import { ListCatalogQueryDto } from '../catalog/catalog-list-query.dto.js';
import { ItemsService } from './items.service.js';
import { AllowApiToken } from '../api-tokens/allow-api-token.decorator.js';

@Controller('items')
@UseGuards(SessionOrApiTokenGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @AllowApiToken()
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: ItemDto) {
    return this.itemsService.create(req.user.sub, dto, {
      viaApiToken: req.viaApiToken,
    });
  }

  @AllowApiToken()
  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: ListCatalogQueryDto) {
    return this.itemsService.list(req.user.sub, query.scope);
  }

  @AllowApiToken()
  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.itemsService.findOne(req.user.sub, id);
  }

  @AllowApiToken()
  @Put(':id')
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ItemDto,
  ) {
    return this.itemsService.replace(req.user.sub, id, dto, {
      viaApiToken: req.viaApiToken,
    });
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
