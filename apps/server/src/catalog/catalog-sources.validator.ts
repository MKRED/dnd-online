import { Transform } from 'class-transformer';
import { IsOptional, ValidateBy } from 'class-validator';
import {
  CATALOG_SOURCE_MAX_LENGTH,
  CATALOG_SOURCES_MAX,
  isCatalogSources,
} from 'shared';

// Источники записи — общее поле предметов, способностей и эффектов (shared/catalogSources.ts).
// Пробелы по краям строк срезаем, пустую строку не пропускаем: форма убирает пустые сама.
// Нет поля — пустой список: PUT без него источники стирает, как описание.
export function CatalogSources(): PropertyDecorator {
  const decorators = [
    Transform(({ value }: { value: unknown }) =>
      Array.isArray(value)
        ? (value as unknown[]).map((source) =>
            typeof source === 'string' ? source.trim() : source,
          )
        : value,
    ),
    IsOptional(),
    ValidateBy({
      name: 'catalogSources',
      validator: {
        validate: isCatalogSources,
        defaultMessage: () =>
          `Источники — до ${CATALOG_SOURCES_MAX} непустых строк, каждая до ${CATALOG_SOURCE_MAX_LENGTH} символов`,
      },
    }),
  ];
  return (target, propertyKey) => {
    for (const decorator of decorators) decorator(target, propertyKey);
  };
}
