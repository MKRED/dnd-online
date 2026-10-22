import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  ANIMATION_FPS_MAX,
  AVAILABLE_GRAPHICS_PRESETS,
  CREATURE_MODEL_MODES,
  FACING_MARKERS,
  FRAME_LIMITS,
  HEALTH_MARK_STYLES,
  RENDER_SCALES,
  type CreatureModelMode,
  type FacingMarker,
  type FrameLimit,
  type GraphicsPreset,
  type HealthMarkStyle,
  type RenderScale,
} from 'shared';

// Частичное изменение настроек: необязательные поля, неизвестные (и прежнее
// graphicsQuality) отбрасывает глобальный whitelist ValidationPipe. Значения графики
// действуют только при наборе «своё»: у остальных наборов их задаёт набор
// (readUserSettings).
export class UpdateSettingsDto {
  @IsOptional()
  @IsIn(FACING_MARKERS, { message: 'Неизвестный вид отметки взгляда' })
  facingMarker?: FacingMarker;

  // «Высокое» пока не сделано — сохранить его нельзя.
  @IsOptional()
  @IsIn(AVAILABLE_GRAPHICS_PRESETS, {
    message: 'Такой набор графики недоступен',
  })
  graphicsPreset?: GraphicsPreset;

  @IsOptional()
  @IsInt({ message: 'Частота анимаций — целое число кадров' })
  @Min(0, { message: 'Частота анимаций — от 0 до 60 кадров' })
  @Max(ANIMATION_FPS_MAX, { message: 'Частота анимаций — от 0 до 60 кадров' })
  animationFps?: number;

  @IsOptional()
  @IsIn(CREATURE_MODEL_MODES, { message: 'Неизвестный режим 3D-моделей' })
  creatureModels?: CreatureModelMode;

  @IsOptional()
  @IsIn(RENDER_SCALES, { message: 'Такой чёткости нет' })
  renderScale?: RenderScale;

  @IsOptional()
  @IsBoolean({ message: 'Сглаживание — да или нет' })
  antialias?: boolean;

  @IsOptional()
  @IsIn(FRAME_LIMITS, { message: 'Такого предела кадров нет' })
  frameLimit?: FrameLimit;

  @IsOptional()
  @IsIn(HEALTH_MARK_STYLES, { message: 'Неизвестный вид метки здоровья' })
  healthMarkStyle?: HealthMarkStyle;
}
