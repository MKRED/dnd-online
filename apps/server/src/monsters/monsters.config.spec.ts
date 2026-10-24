import { DEFAULT_MONSTER_STAT_BLOCK } from 'shared';
import { describe, expect, it } from 'vitest';
import type { MonsterDto } from './dto/monster.dto.js';
import { MONSTERS_CONFIG, toMonsterFields } from './monsters.config.js';

describe('monsters.config', () => {
  const statBlock = { ...DEFAULT_MONSTER_STAT_BLOCK, armorClass: 17 };

  it('читает тип из колонки, стат-блок и роль — из extra', () => {
    expect(
      toMonsterFields('aberration', {}, { statBlock, role: 'unique' }),
    ).toEqual({
      category: 'aberration',
      statBlock,
      role: 'unique',
      model: null,
    });
  });

  it('читает ссылку на модель, испорченную — как «без модели»', () => {
    const model = { id: '00000000-0000-4000-8000-000000000001', scale: 2 };
    expect(toMonsterFields('dragon', {}, { statBlock, model }).model).toEqual(
      model,
    );
    expect(
      toMonsterFields('dragon', {}, { statBlock, model: { id: 'x' } }).model,
    ).toBeNull();
  });

  // Испорченный jsonb или неизвестный тип не ломают каталог.
  it('испорченные поля — значения по умолчанию', () => {
    expect(
      toMonsterFields('kaiju', {}, { statBlock: { armorClass: 17 } }),
    ).toEqual({
      category: 'aberration',
      statBlock: DEFAULT_MONSTER_STAT_BLOCK,
      role: 'regular',
      model: null,
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

  // Нет поля — ссылку на модель не трогаем: её сохранит keptExtra из прежней записи.
  it('пишет ссылку на модель, только если она есть в теле', () => {
    const base = { category: 'dragon', statBlock, role: 'regular' };
    const model = { id: '00000000-0000-4000-8000-000000000001', scale: 1 };
    expect(
      MONSTERS_CONFIG.toStored({ ...base, model } as MonsterDto).extra,
    ).toEqual({ statBlock, role: 'regular', model });
    expect(
      MONSTERS_CONFIG.toStored({ ...base, model: null } as MonsterDto).extra,
    ).toEqual({ statBlock, role: 'regular', model: null });
    expect(MONSTERS_CONFIG.keptExtra).toEqual(['model']);
  });
});
