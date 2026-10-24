import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AllowApiToken } from '../api-tokens/allow-api-token.decorator.js';
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { MODEL_CONTENT_TYPES } from '../character-models/model-content-types.js';
import { MonsterModelService } from './monster-model.service.js';

// Файл 3D-модели монстра (docs/plan/done/monster-models.md). Ссылку на модель меняет тело
// монстра, а саму модель — её маршруты в «Моделях».
@Controller('monsters/:id/models/:modelId')
@UseGuards(SessionOrApiTokenGuard)
export class MonsterModelController {
  constructor(private readonly service: MonsterModelService) {}

  // Клиент добавляет в адрес версию файла (?v=), поэтому ответ кешируется навсегда.
  @AllowApiToken()
  @Get('file')
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async file(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('modelId', ParseUUIDPipe) modelId: string,
  ) {
    const { data, format } = await this.service.file(req.user.sub, id, modelId);
    return new StreamableFile(data, {
      type: MODEL_CONTENT_TYPES[format],
      length: data.length,
    });
  }
}
