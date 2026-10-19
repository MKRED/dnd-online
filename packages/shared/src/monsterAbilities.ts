import type { AbilityLink } from './abilityLinks.js';

// Способности у монстра (docs/plan/monsters-npcs.md, этап 5): ссылки на каталог, как у
// персонажа, но без подготовки — вместо неё частота заклинания.

// Предел «N/день» — правило приложения: в книгах бывает 1–3 (docs/dnd/monsters.md, «Usage
// limits»), запас — для своих монстров.
export const MONSTER_SPELL_PER_DAY_MAX = 9;

export type MonsterAbilityEntry = {
  id: string;
  // «N в день» у заклинания; null — неограниченно. Лежит на связи: одно заклинание у разных
  // монстров ограничено по-разному. У остальных категорий всегда null.
  perDay: number | null;
} & AbilityLink;

export interface MonsterAbilityAddInput {
  abilityId: string;
  perDay?: number | null;
}

export interface MonsterAbilityUpdateInput {
  perDay: number | null;
}

export const isMonsterSpellPerDay = (value: unknown): value is number =>
  Number.isInteger(value) &&
  (value as number) >= 1 &&
  (value as number) <= MONSTER_SPELL_PER_DAY_MAX;

// Частоту задают только заклинанию; снять её (null) можно всегда. null вместо записи —
// способность не видна или удалена. Категория — строкой, как в колонке базы.
export const perDayFits = (
  card: { category: string } | null,
  perDay: number | null,
) => perDay === null || card?.category === 'spell';

// «Неограниченно» и «1/день» — как в книге: «At Will», «1/Day Each».
export const formatPerDay = (perDay: number | null) =>
  perDay === null ? 'Неограниченно' : `${perDay}/день`;
