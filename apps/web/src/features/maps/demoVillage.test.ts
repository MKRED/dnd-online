import { parseMapOpBatch } from 'shared';
import { describe, expect, it } from 'vitest';
import { DEMO_VILLAGE_OPS } from './demoVillage';

// Значения по умолчанию серверных лимитов (apps/server/src/maps/map-limits.ts).
const SERVER_DEFAULT_LIMITS = {
  maxOpVolume: 32_768,
  maxBatchVolume: 65_536,
  maxOpsPerBatch: 100,
  maxCoordinate: 100_000,
};

describe('DEMO_VILLAGE_OPS', () => {
  it('проходит серверную проверку пачки', () => {
    expect(() =>
      parseMapOpBatch(DEMO_VILLAGE_OPS, SERVER_DEFAULT_LIMITS),
    ).not.toThrow();
  });
});
