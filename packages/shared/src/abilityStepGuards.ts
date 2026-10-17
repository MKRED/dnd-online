import { FEET_STEP } from './abilitySteps.js';

// Мелкие проверки значений из запроса для шагов «Применения» и их областей.

export const keysAre = (value: object, keys: string) =>
  Object.keys(value).sort().join(',') === keys;
export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const isIntIn = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;
// Футы кратны 5 — клетка карты.
export const isFeet = (value: unknown, max: number) =>
  isIntIn(value, FEET_STEP, max) && (value as number) % FEET_STEP === 0;
