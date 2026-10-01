// Формулы 5e: модификатор от значения характеристики, и бонусы, которые от него зависят.

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

export function getSavingThrowBonus(
  score: number,
  proficient: boolean,
  proficiencyBonus: number,
): number {
  return getAbilityModifier(score) + (proficient ? proficiencyBonus : 0);
}

export function getSkillBonus(
  score: number,
  proficient: boolean,
  expertise: boolean,
  proficiencyBonus: number,
): number {
  const abilityModifier = getAbilityModifier(score);
  if (proficient && expertise) return abilityModifier + proficiencyBonus * 2;
  if (proficient) return abilityModifier + proficiencyBonus;
  return abilityModifier;
}
