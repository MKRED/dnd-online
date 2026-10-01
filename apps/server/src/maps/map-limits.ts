import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MapBatchLimits } from 'shared';

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

// Лимиты карт из конфига, а не размер карты: карта растущая, а защищаться нужно от
// случайного раздувания (в том числе ошибкой нейросети). Меняются без миграций.
@Injectable()
export class MapLimitsConfig implements MapBatchLimits {
  readonly maxOpVolume: number;
  readonly maxBatchVolume: number;
  readonly maxOpsPerBatch: number;
  readonly maxCoordinate: number;
  // Чанк — 8 КБ, 4096 чанков — 32 МБ на карту.
  readonly maxChunks: number;

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
    this.maxCoordinate = readPositiveInt(
      configService,
      'MAP_MAX_COORDINATE',
      100_000,
    );
    this.maxChunks = readPositiveInt(configService, 'MAP_MAX_CHUNKS', 4096);
  }
}
