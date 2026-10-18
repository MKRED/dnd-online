import { IsBoolean, IsOptional, ValidateBy } from 'class-validator';
import {
  EFFECT_COMPONENTS_MAX,
  isEffectComponents,
  isEffectDuration,
  isEffectSaveEnds,
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
        // Общий текст на все виды: форма проверяет каждое поле сама, сюда доходит только
        // запрос в обход неё.
        `Составляющие эффекта заданы неверно: не больше ${EFFECT_COMPONENTS_MAX}; каждое чувство и состояние — один раз, тип урона — один раз на уровень защиты; проверьте поля каждой составляющей`,
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

  // Флаг одного запроса, в эффекте не хранится (docs/plan/done/abilities.md, этап 8). Скрыть
  // вместе с эффектом свои опубликованные способности, которые его накладывают.
  @IsOptional()
  @IsBoolean({ message: 'Признак «скрыть способности» — да или нет' })
  hideAbilities?: boolean;
}
