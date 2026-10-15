import {
  BadRequestException,
  Body,
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
import type { AuthenticatedRequest } from '../../auth/auth.guard.js';
import { UploadTooLargeFilter } from '../../images/upload-too-large.filter.js';
import type { CatalogImageEditService } from './catalog-image-edit.service.js';
import type { CatalogImageFilesService } from './catalog-image-files.service.js';
import {
  CatalogImageFileQueryDto,
  UpdateCatalogImageDto,
} from './dto/catalog-image.dto.js';

// Из того, что multer кладёт в файл, нужны только байты (хранилище — память).
interface UploadedImage {
  buffer: Buffer;
}

// Маршруты картинки записи каталога. Каждый каталог наследует класс со своим адресом
// (`@Controller('items/:ownerId/image')`) и AuthGuard, а обработчики берёт отсюда: Nest
// читает декораторы методов и по цепочке наследования.
export abstract class CatalogImagesController {
  protected constructor(
    private readonly filesService: CatalogImageFilesService,
    private readonly editService: CatalogImageEditService,
  ) {}

  // Картинка у записи одна, поэтому загрузка — PUT: она же и замена.
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
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
    @UploadedFile() file: UploadedImage | undefined,
  ) {
    if (!file) throw new BadRequestException('Файл картинки не передан');
    return this.editService.upload(req.user.sub, ownerId, file.buffer);
  }

  // Клиент добавляет в адрес версию картинки (?v=), а она растёт при каждой замене и
  // смене выреза, поэтому ответ можно кешировать навсегда. private — скрытую запись
  // видит только автор, общим кешам хранить нельзя.
  @Get()
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async file(
    @Req() req: AuthenticatedRequest,
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
    @Query() query: CatalogImageFileQueryDto,
  ) {
    const data = await this.filesService.getFile(
      req.user.sub,
      ownerId,
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
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
    @Body() dto: UpdateCatalogImageDto,
  ) {
    return this.editService.recrop(req.user.sub, ownerId, dto.thumbCrop);
  }

  @Delete()
  @HttpCode(204)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
  ) {
    return this.editService.remove(req.user.sub, ownerId);
  }
}
