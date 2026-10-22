import { MATERIALS } from 'shared';
import { describe, expect, it } from 'vitest';
import { blocksOf, materialGroups, searchBlocks } from './blockGroups';

describe('materialGroups', () => {
  it('каждый материал — ровно в одной группе', () => {
    const listed = materialGroups().flatMap((group) => group.materials);
    expect([...listed].sort()).toEqual(Object.keys(MATERIALS).sort());
  });
});

describe('blocksOf', () => {
  it('все формы материала, куб первым', () => {
    const blocks = blocksOf('stone').map((block) => block.name);
    expect(blocks[0]).toBe('stone');
    expect(blocks).toContain('stone_stairs');
    expect(blocks.every((name) => name.startsWith('stone'))).toBe(true);
  });
});

describe('searchBlocks', () => {
  const names = (query: string) => searchBlocks(query).map((b) => b.name);

  it('слова запроса — начала слов названия, в любом порядке', () => {
    expect(names('кам ступ')).toEqual(['stone_stairs']);
    expect(names('ступ кам')).toEqual(['stone_stairs']);
  });

  it('одно слово находит форму у всех материалов', () => {
    expect(names('ступени')).toHaveLength(Object.keys(MATERIALS).length);
  });

  it('ё и е — одно и то же, регистр не важен', () => {
    expect(names('ЛЕД')).toContain('ice');
  });

  it('пустой запрос — пусто', () => {
    expect(names('  ')).toEqual([]);
  });
});
