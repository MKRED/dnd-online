import {
  ABILITY_SCORES,
  SKILL_ABILITIES,
  type AbilityScore,
  type Skill,
} from 'shared';

// Навыки под своей характеристикой, в порядке справочника: так их показывают и форма,
// и лист персонажа.
export const SKILLS_BY_ABILITY = (
  Object.keys(SKILL_ABILITIES) as Skill[]
).reduce<Record<AbilityScore, Skill[]>>(
  (acc, skill) => {
    acc[SKILL_ABILITIES[skill]].push(skill);
    return acc;
  },
  ABILITY_SCORES.reduce<Record<AbilityScore, Skill[]>>(
    (acc, ability) => {
      acc[ability] = [];
      return acc;
    },
    {} as Record<AbilityScore, Skill[]>,
  ),
);
