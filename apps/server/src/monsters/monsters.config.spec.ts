import { DEFAULT_MONSTER_STAT_BLOCK } from 'shared';
import { describe, expect, it } from 'vitest';
import type { MonsterDto } from './dto/monster.dto.js';
import { MONSTERS_CONFIG, toMonsterFields } from './monsters.config.js';

describe('monsters.config', () => {
  const statBlock = { ...DEFAULT_MONSTER_STAT_BLOCK, armorClass: 17 };

  it('читает тип из колонки, стат-блок и роль — из extra', () => {
    expect(
      toMonsterFields('aberration', {}, { statBlock, role: 'unique' }),
    ).toEqual({ category: 'aberration', statBlock, role: 'unique' });
  });

  // Испорченный jsonb или неизвестный тип не ломают каталог.
  it('испорченные поля — значения по умолчанию', () => {
    expect(
      toMonsterFields('kaiju', {}, { statBlock: { armorClass: 17 } }),
    ).toEqual({
      category: 'aberration',
      statBlock: DEFAULT_MONSTER_STAT_BLOCK,
      role: 'regular',
    });
  });

  it('пишет тип в колонку, стат-блок и роль — в extra', () => {
    const dto = {
      category: 'dragon',
      statBlock,
      role: 'regular',
    } as MonsterDto;
    expect(MONSTERS_CONFIG.toStored(dto)).toEqual({
      category: 'dragon',
      details: {},
      extra: { statBlock, role: 'regular' },
    });
  });
});
