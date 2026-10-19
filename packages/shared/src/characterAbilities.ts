import type { AbilityLink, AbilityLinkCard } from './abilityLinks.js';

// Способности у персонажа (docs/plan/done/character-abilities.md); общая часть строки — в
// abilityLinks.ts.

export type CharacterAbilityEntry = {
  id: string;
  // Подготовлено ли заклинание. Смысл есть только у заклинания 1 круга и выше: у
  // остального лист отметку не показывает, даже если в базе она осталась.
  prepared: boolean;
} & AbilityLink;

export interface CharacterAbilityAddInput {
  abilityId: string;
}

export interface CharacterAbilityUpdateInput {
  prepared: boolean;
}

// Заговоры не готовят, у умений подготовки нет.
export function canBePrepared(
  card: Pick<AbilityLinkCard, 'category' | 'level'>,
): boolean {
  return card.category === 'spell' && (card.level ?? 0) >= 1;
}
