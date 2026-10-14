import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IMAGE_MAX_BYTES } from 'shared';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { UploadTooLargeFilter } from '../images/upload-too-large.filter.js';
import {
  ItemImageFileQueryDto,
  UpdateItemImageDto,
} from './dto/item-image.dto.js';
import { ItemImageEditService } from './item-image-edit.service.js';
import { ItemImagesService } from './item-images.service.js';

// Из того, что multer кладёт в файл, нужны только байты (хранилище — память).
interface UploadedImage {
  buffer: Buffer;
}

@Controller('items/:itemId/image')
@UseGuards(AuthGuard)
export class ItemImagesController {
  constructor(
    private readonly imagesService: ItemImagesService,
    private readonly editService: ItemImageEditService,
  ) {}

  // Картинка у предмета одна, поэтому загрузка — PUT: она же и замена.
  // Перекодирование нагружает процессор, поэтому ограничиваем по IP.
  @Put()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @UseFilters(UploadTooLargeFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: IMAGE_MAX_BYTES, files: 1 },
    }),
  )
  upload(
    @Req() req: AuthenticatedRequest,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @UploadedFile() file: UploadedImage | undefined,
  ) {
    if (!file) throw new BadRequestException('Файл картинки не передан');
    return this.editService.upload(req.user.sub, itemId, file.buffer);
  }

  // Клиент добавляет в адрес версию картинки (?v=), а она растёт при каждой замене и
  // смене выреза, поэтому ответ можно кешировать навсегда. private — скрытый предмет
  // видит только автор, общим кешам хранить нельзя.
  @Get()
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async file(
    @Req() req: AuthenticatedRequest,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Query() query: ItemImageFileQueryDto,
  ) {
    const data = await this.imagesService.getFile(
      req.user.sub,
      itemId,
      query.variant ?? 'full',
    );
    return new StreamableFile(data, {
      type: 'image/webp',
      length: data.length,
    });
  }

  @Patch()
  recrop(
    @Req() req: AuthenticatedRequest,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateItemImageDto,
  ) {
    return this.editService.recrop(req.user.sub, itemId, dto.thumbCrop);
  }

  @Delete()
  @HttpCode(204)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.editService.remove(req.user.sub, itemId);
  }
}
