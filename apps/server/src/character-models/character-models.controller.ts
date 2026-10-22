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
import { CHARACTER_MODEL_MAX_BYTES, type CharacterModelView } from 'shared';
import { AllowApiToken } from '../api-tokens/allow-api-token.decorator.js';
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { CharacterModelsService } from './character-models.service.js';
import { PatchCharacterModelDto } from './dto/patch-character-model.dto.js';
import { ModelTooLargeFilter } from './model-too-large.filter.js';

export const MODEL_CONTENT_TYPES = {
  glb: 'model/gltf-binary',
  stl: 'model/stl',
} as const;

// 3D-модель персонажа (docs/plan/character-models.md): метаданные, файл, загрузка,
// цвет и поправка, удаление.
@Controller('characters/:characterId/model')
@UseGuards(SessionOrApiTokenGuard)
export class CharacterModelsController {
  constructor(private readonly service: CharacterModelsService) {}

  // model: null — модели нет: у большинства персонажей её нет, и это не ошибка. В
  // обёртке: голый null Nest отдал бы пустым телом.
  @AllowApiToken()
  @Get()
  async get(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
  ): Promise<CharacterModelView> {
    return { model: await this.service.get(req.user.sub, characterId) };
  }

  // Клиент добавляет в адрес версию модели (?v=), поэтому ответ кешируется навсегда.
  @AllowApiToken()
  @Get('file')
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async file(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
  ) {
    const { data, format } = await this.service.file(req.user.sub, characterId);
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
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ) {
    if (!file) throw new BadRequestException('Файл модели не передан');
    return this.service.upload(req.user.sub, characterId, file.buffer);
  }

  @AllowApiToken()
  @Patch()
  patch(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Body() dto: PatchCharacterModelDto,
  ) {
    return this.service.patch(req.user.sub, characterId, dto);
  }

  // Удаление токену закрыто, как и у картинок (docs/plan/ai-access.md).
  @Delete()
  @HttpCode(204)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', ParseUUIDPipe) characterId: string,
  ) {
    return this.service.remove(req.user.sub, characterId);
  }
}
