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
  Req,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CHARACTER_MODEL_MAX_BYTES } from 'shared';
import { AllowApiToken } from '../../api-tokens/allow-api-token.decorator.js';
import { SessionOrApiTokenGuard } from '../../api-tokens/session-or-api-token.guard.js';
import type { AuthenticatedRequest } from '../../auth/auth.guard.js';
import { MODEL_CONTENT_TYPES } from '../../character-models/model-content-types.js';
import { ModelTooLargeFilter } from '../../character-models/model-too-large.filter.js';
import { PatchModelMeshDto } from './dto/patch-model-mesh.dto.js';
import { VoxelModelMeshService } from './voxel-model-mesh.service.js';

// Загруженный файл модели (docs/plan/blocks.md, этап 9): байты, загрузка, цвет и
// вписывание, удаление. Предел файла — как у моделей персонажей.
@Controller('voxel-models/:id/mesh')
@UseGuards(SessionOrApiTokenGuard)
export class VoxelModelMeshController {
  constructor(private readonly service: VoxelModelMeshService) {}

  // Клиент добавляет в адрес версию файла (?v=), поэтому ответ кешируется навсегда.
  @AllowApiToken()
  @Get('file')
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async file(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const { data, format } = await this.service.file(req.user.sub, id);
    return new StreamableFile(data, {
      type: MODEL_CONTENT_TYPES[format],
      length: data.length,
    });
  }

  @AllowApiToken()
  @Put()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseFilters(ModelTooLargeFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: CHARACTER_MODEL_MAX_BYTES, files: 1 },
    }),
  )
  upload(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ) {
    if (!file) throw new BadRequestException('Файл модели не передан');
    return this.service.upload(req.user.sub, id, file.buffer);
  }

  @AllowApiToken()
  @Patch()
  patch(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchModelMeshDto,
  ) {
    return this.service.patch(req.user.sub, id, dto);
  }

  // Удаление токену закрыто, как и у картинок (docs/plan/ai-access.md).
  @Delete()
  @HttpCode(204)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(req.user.sub, id);
  }
}
