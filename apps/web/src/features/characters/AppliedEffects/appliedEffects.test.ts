import { NO_ABILITY_COSTS, type CharacterEffectCard } from 'shared';
import { describe, expect, it } from 'vitest';
import { effectRows, traitRows } from './appliedEffects';

const card = (
  over: Partial<CharacterEffectCard> = {},
): CharacterEffectCard => ({
  id: 'grab',
  name: 'Захват',
  isPublic: false,
  image: null,
  components: [{ kind: 'condition', condition: 'grappled' }],
  duration: { kind: 'permanent' },
  saveEnds: null,
  ...over,
});

const trait = (passive: CharacterEffectCard['components']) => ({
  id: 'row-1',
  missing: null,
  inactive: false,
  ability: {
    id: 'aura',
    name: 'Аура',
    isPublic: false,
    image: null,
    category: 'monster' as const,
    level: null,
    activation: { kind: 'trait' as const },
    costs: NO_ABILITY_COSTS,
    recharge: null,
    passive,
  },
});

describe('effectRows', () => {
  it('эффект строкой: имя, откуда и что даёт состояние по книге', () => {
    const [row] = effectRows(
      [{ id: 'l1', effect: card(), missing: null, inactive: false }],
      'наложен в игре',
    );
    expect(row).toMatchObject({
      id: 'grab',
      name: 'Захват',
      source: 'наложен в игре',
      idle: null,
    });
    expect(row.lines[0].text).toBe('Схваченный');
    expect(row.lines[0].details.join(' ')).toMatch(/Скорость/);
  });

  it('скрытый автором и не действующий — с причиной', () => {
    const rows = effectRows(
      [
        { id: 'l1', effect: null, missing: 'hidden' },
        { id: 'l2', effect: card(), missing: null, inactive: true },
      ],
      'наложен',
    );
    expect(rows.map((row) => row.idle)).toEqual([
      'скрыт автором',
      'не действует',
    ]);
    expect(rows[0].id).toBeNull();
  });
});

describe('traitRows', () => {
  it('черта со своими составляющими — в списке, без них — нет', () => {
    const rows = traitRows([
      trait([{ kind: 'no_healing' }]),
      { ...trait([]), id: 'row-2' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'ability', source: 'черта' });
    expect(rows[0].lines.map((line) => line.text)).toEqual([
      'Не восстанавливает хиты',
    ]);
  });
});
