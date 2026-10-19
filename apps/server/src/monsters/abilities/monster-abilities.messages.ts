import { MONSTER_SPELL_PER_DAY_MAX } from 'shared';

// Ошибки способностей на монстре; интерфейс показывает их как есть.
export const MONSTER_ABILITY_NOT_FOUND = 'Способность не найдена';
export const MONSTER_ABILITY_ALREADY = 'Способность уже добавлена';
export const MONSTER_ABILITY_ENTRY_NOT_FOUND =
  'Способность у монстра не найдена';
export const MONSTER_ABILITY_PER_DAY_SPELL_ONLY =
  'Частоту в день задают только заклинанию';
export const MONSTER_ABILITY_PER_DAY_RANGE = `Частота — от 1 до ${MONSTER_SPELL_PER_DAY_MAX} раз в день`;
