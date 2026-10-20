import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_MAP_LIMITS,
  DEFAULT_MAX_OBJECTS,
  type MapBatchLimits,
} from 'shared';

function readPositiveInt(
  configService: ConfigService,
  key: string,
  fallback: number,
): number {
  const raw = configService.get<string>(key);
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `${key} должно быть положительным целым, получено «${raw}»`,
    );
  }
  return value;
}

// Лимиты карт из конфига: защита от случайного раздувания (в том числе ошибкой
// нейросети) и общие для всех карт пределы размера и высоты
// (docs/plan/done/map-editor.md, «Размер карты»). Меняются без миграций.
@Injectable()
export class MapLimitsConfig implements MapBatchLimits {
  readonly maxOpVolume: number;
  readonly maxBatchVolume: number;
  readonly maxOpsPerBatch: number;
  // Наибольшие ширина и глубина карты; координаты x и z — меньше этого числа.
  readonly maxSize: number;
  // Уровней по высоте у любой карты: y от 0 до maxHeight − 1.
  readonly maxHeight: number;
  // Чанк — 8 КБ, 4096 чанков — 32 МБ на карту.
  readonly maxChunks: number;
  // Объектов на одной карте (docs/plan/map-objects.md).
  readonly maxObjects: number;

  constructor(configService: ConfigService) {
    this.maxOpVolume = readPositiveInt(
      configService,
      'MAP_MAX_OP_VOLUME',
      32_768,
    );
    this.maxBatchVolume = readPositiveInt(
      configService,
      'MAP_MAX_BATCH_VOLUME',
      65_536,
    );
    this.maxOpsPerBatch = readPositiveInt(
      configService,
      'MAP_MAX_OPS_PER_BATCH',
      100,
    );
    this.maxSize = readPositiveInt(
      configService,
      'MAP_MAX_SIZE',
      DEFAULT_MAP_LIMITS.maxSize,
    );
    this.maxHeight = readPositiveInt(
      configService,
      'MAP_MAX_HEIGHT',
      DEFAULT_MAP_LIMITS.maxHeight,
    );
    this.maxChunks = readPositiveInt(configService, 'MAP_MAX_CHUNKS', 4096);
    this.maxObjects = readPositiveInt(
      configService,
      'MAP_MAX_OBJECTS',
      DEFAULT_MAX_OBJECTS,
    );
  }
}
