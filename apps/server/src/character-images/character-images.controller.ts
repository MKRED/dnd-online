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
  Post,
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
import { CHARACTER_IMAGE_MAX_BYTES } from 'shared';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import { CharacterImageEditService } from './character-image-edit.service.js';
import { CharacterImagesService } from './character-images.service.js';
import { ImageFileQueryDto } from './dto/image-file-query.dto.js';
import { UpdateCharacterImageDto } from './dto/update-character-image.dto.js';
import { UploadTooLargeFilter } from '../images/upload-too-large.filter.js';
import { AllowApiToken } from '../api-tokens/allow-api-token.decorator.js';

// Из того, что multer кладёт в файл, нужны только байты (хранилище — память).
interface UploadedImage {
  buffer: Buffer;
}

@Controller('characters/:characterId/images')
@UseGuards(SessionOrApiTokenGuard)
export class CharacterImagesController {
  constructor(
    private readonly imagesService: CharacterImagesService,
    private readonly editService: CharacterImageEditService,
  ) {}

  @AllowApiToken()
  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
  ) {
    return this.imagesService.list(req.user.sub, characterId);
  }

  // Перекодирование картинки нагружает процессор, поэтому загрузку ограничиваем по IP.
  @AllowApiToken()
  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @UseFilters(UploadTooLargeFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: CHARACTER_IMAGE_MAX_BYTES, files: 1 },
    }),
  )
  upload(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @UploadedFile() file: UploadedImage | undefined,
  ) {
    if (!file) throw new BadRequestException('Файл картинки не передан');
    return this.editService.upload(req.user.sub, characterId, file.buffer);
  }

  // Содержимое full и preview по id не меняется, а у миниатюры клиент добавляет в адрес
  // версию (?v=), поэтому ответ можно кешировать навсегда. private — картинки видят
  // только автор и зрители по ссылке, общим кешам их хранить нельзя.
  @AllowApiToken()
  @Get(':imageId/file')
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async file(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Query() query: ImageFileQueryDto,
  ) {
    const data = await this.imagesService.getFile(
      req.user.sub,
      characterId,
      imageId,
      query.variant ?? 'full',
    );
    return new StreamableFile(data, {
      type: 'image/webp',
      length: data.length,
    });
  }

  @AllowApiToken()
  @Patch(':imageId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() dto: UpdateCharacterImageDto,
  ) {
    return this.editService.update(req.user.sub, characterId, imageId, dto);
  }

  @Delete(':imageId')
  @HttpCode(204)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.editService.remove(req.user.sub, characterId, imageId);
  }
}
