import {
  Catch,
  PayloadTooLargeException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { CHARACTER_MODEL_MAX_BYTES } from 'shared';

const MAX_MEGABYTES = CHARACTER_MODEL_MAX_BYTES / (1024 * 1024);

// multer обрывает слишком большой файл с английским «File too large»; интерфейс
// показывает message сервера как есть.
@Catch(PayloadTooLargeException)
export class ModelTooLargeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(413)
      .json({
        statusCode: 413,
        message: `Модель больше ${MAX_MEGABYTES} МБ — упростите её и попробуйте снова`,
      });
  }
}
