import { IsIn, IsOptional } from 'class-validator';
import {
  AVAILABLE_GRAPHICS_QUALITIES,
  FACING_MARKERS,
  HEALTH_MARK_STYLES,
  type FacingMarker,
  type GraphicsQuality,
  type HealthMarkStyle,
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

  @IsOptional()
  @IsIn(HEALTH_MARK_STYLES, { message: 'Неизвестный вид метки здоровья' })
  healthMarkStyle?: HealthMarkStyle;
}
