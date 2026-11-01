import { getAbilityModifier } from './abilityModifier.js';
import type { AbilityScore, Character } from './character.js';

// Атака заклинанием и Сл спасброска заклинаний (docs/dnd/attacks-and-saves.md):
// модификатор заклинательной характеристики + бонус мастерства, Сл — ещё 8. Характеристику
// выбирает игрок — одну на персонажа, у мультикласса основную (docs/dnd/spells.md).
export interface SpellcastingNumbers {
  ability: AbilityScore;
  attack: number;
  saveDc: number;
}

// null — характеристика не выбрана: персонаж не колдует.
export function spellcastingNumbers(
  character: Pick<
    Character,
    'spellcastingAbility' | 'abilityScores' | 'proficiencyBonus'
  >,
): SpellcastingNumbers | null {
  const ability = character.spellcastingAbility;
  if (!ability) return null;
  const attack =
    getAbilityModifier(character.abilityScores[ability]) +
    character.proficiencyBonus;
  return { ability, attack, saveDc: 8 + attack };
}
