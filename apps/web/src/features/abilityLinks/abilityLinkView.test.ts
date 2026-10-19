import { NO_ABILITY_COSTS, type AbilityLinkCard } from 'shared';
import { describe, expect, it } from 'vitest';
import { abilitySummary } from './abilityLinkView';

const card = (over: Partial<AbilityLinkCard>): AbilityLinkCard => ({
  id: 'a',
  name: 'Способность',
  isPublic: true,
  image: null,
  category: 'basic',
  level: null,
  activation: { kind: 'action' },
  costs: NO_ABILITY_COSTS,
  recharge: null,
  ...over,
});

describe('abilitySummary', () => {
  it('у умения активацию не повторяет — она в заголовке группы', () => {
    expect(
      abilitySummary(
        card({
          activation: { kind: 'bonus_action' },
          costs: {
            ...NO_ABILITY_COSTS,
            uses: { count: { kind: 'fixed', amount: 1 }, recovery: 'short' },
          },
        }),
      ),
    ).toBe('1 заряд — все после короткого или долгого отдыха');
  });

  it('у умения показывает только условие реакции и время', () => {
    expect(
      abilitySummary(
        card({ activation: { kind: 'reaction', trigger: 'когда вас бьют' } }),
      ),
    ).toBe('когда вас бьют');
    expect(
      abilitySummary(
        card({ activation: { kind: 'time', amount: 10, unit: 'minute' } }),
      ),
    ).toBe('10 минут');
  });

  it('у заклинания — активация, а ячейку не пишет: круг уже в заголовке', () => {
    expect(
      abilitySummary(
        card({
          category: 'spell',
          level: 1,
          costs: { ...NO_ABILITY_COSTS, spellSlot: { minLevel: 1 } },
        }),
      ),
    ).toBe('Действие');
  });

  it('у способности монстра — цена легендарного действия и перезарядка', () => {
    expect(
      abilitySummary(
        card({
          category: 'monster',
          activation: { kind: 'legendary', cost: 2 },
        }),
      ),
    ).toBe('стоит 2 действия');
    expect(
      abilitySummary(
        card({
          category: 'monster',
          activation: { kind: 'legendary', cost: 1 },
        }),
      ),
    ).toBe('');
    expect(abilitySummary(card({ category: 'monster', recharge: 5 }))).toBe(
      'Перезарядка 5–6',
    );
  });
});
