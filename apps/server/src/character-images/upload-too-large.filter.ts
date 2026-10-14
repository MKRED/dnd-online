import {
  Catch,
  PayloadTooLargeException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { CHARACTER_IMAGE_MAX_BYTES } from 'shared';

const MAX_MEGABYTES = CHARACTER_IMAGE_MAX_BYTES / (1024 * 1024);

// multer обрывает слишком большой файл сам, и Nest отвечает английским «File too large».
// Интерфейс показывает message сервера как есть, поэтому подменяем текст на русский.
@Catch(PayloadTooLargeException)
export class UploadTooLargeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(413)
      .json({
        statusCode: 413,
        message: `Картинка больше ${MAX_MEGABYTES} МБ — уменьшите её и попробуйте снова`,
      });
  }
}
