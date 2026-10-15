import { ValidateBy } from 'class-validator';
import {
  EFFECT_COMPONENTS_MAX,
  isEffectComponents,
  isEffectDuration,
  isEffectSaveEnds,
  SENSE_RANGE_MAX,
  type EffectComponent,
  type EffectDuration,
  type EffectSaveEnds,
} from 'shared';
import { CatalogEntryDto } from '../../catalog/entries/dto/catalog-entry.dto.js';

// Создание и полное редактирование эффекта — одно и то же тело. Все три поля
// обязательны; виды и пределы — в shared (effectComponents.ts, effectDuration.ts,
// effectSaveEnds.ts).
export class EffectDto extends CatalogEntryDto {
  @ValidateBy({
    name: 'effectComponents',
    validator: {
      validate: isEffectComponents,
      defaultMessage: () =>
        `Составляющие эффекта заданы неверно: не больше ${EFFECT_COMPONENTS_MAX}, каждое чувство — один раз, дистанция кратна 5, до ${SENSE_RANGE_MAX} фт.`,
    },
  })
  components: EffectComponent[];

  @ValidateBy({
    name: 'effectDuration',
    validator: {
      validate: isEffectDuration,
      defaultMessage: () => 'Длительность эффекта задана неверно',
    },
  })
  duration: EffectDuration;

  // null — эффект спасброском не снимается; поле всё равно обязательно, чтобы забытое
  // поле не выглядело как осознанное «не снимается».
  @ValidateBy({
    name: 'effectSaveEnds',
    validator: {
      validate: isEffectSaveEnds,
      defaultMessage: () => 'Спасбросок, снимающий эффект, задан неверно',
    },
  })
  saveEnds: EffectSaveEnds | null;
}
