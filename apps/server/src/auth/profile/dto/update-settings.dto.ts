import { IsIn, IsOptional } from 'class-validator';
import {
  AVAILABLE_GRAPHICS_QUALITIES,
  FACING_MARKERS,
  type FacingMarker,
  type GraphicsQuality,
} from 'shared';

// Частичное изменение настроек: необязательные поля, неизвестные отбрасывает
// глобальный whitelist ValidationPipe.
export class UpdateSettingsDto {
  @IsOptional()
  @IsIn(FACING_MARKERS, { message: 'Неизвестный вид отметки взгляда' })
  facingMarker?: FacingMarker;

  // «Высокое» качество пока не сделано — сохранить его нельзя.
  @IsOptional()
  @IsIn(AVAILABLE_GRAPHICS_QUALITIES, {
    message: 'Такое качество графики недоступно',
  })
  graphicsQuality?: GraphicsQuality;
}
