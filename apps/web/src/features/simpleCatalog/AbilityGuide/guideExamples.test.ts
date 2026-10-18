import { growthBasis, isAbilitySteps } from 'shared';
import { describe, expect, it } from 'vitest';
import { GUIDE_EXAMPLES } from './guideExamples';

describe('GUIDE_EXAMPLES', () => {
  // Пример, который сервер не принял бы, учил бы невозможному.
  it.each(GUIDE_EXAMPLES.map((example) => [example.name, example]))(
    '«%s» проходит проверку шагов',
    (_name, example) => {
      expect(isAbilitySteps(example.ability.steps)).toBe(true);
    },
  );

  it('растут так, как написано в тексте', () => {
    const kinds = GUIDE_EXAMPLES.map(
      ({ ability }) => growthBasis(ability, ability.costs).kind,
    );
    expect(kinds).toEqual(['level', 'slot', 'slot', 'slot', 'level']);
  });
});
