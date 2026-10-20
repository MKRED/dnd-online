import { IsIn, IsOptional } from 'class-validator';
import { FACING_MARKERS, type FacingMarker } from 'shared';

// Частичное изменение настроек: необязательные поля, неизвестные отбрасывает
// глобальный whitelist ValidationPipe.
export class UpdateSettingsDto {
  @IsOptional()
  @IsIn(FACING_MARKERS, { message: 'Неизвестный вид отметки взгляда' })
  facingMarker?: FacingMarker;
}
