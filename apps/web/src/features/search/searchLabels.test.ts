import { describe, expect, it } from 'vitest';
import type { SearchGroup } from 'shared';
import {
  searchHitDetails,
  searchHitPath,
  searchPagePath,
} from './searchLabels';

const catalog = { id: 'a', name: 'X', mine: true, authorNickname: 'm' };
// Подпись одной записи — через группу из неё одной.
const detail = (group: Omit<SearchGroup, 'total'>) =>
  searchHitDetails({ ...group, total: 1 } as SearchGroup)[0];

describe('searchHitDetails', () => {
  it('способность: круг заклинания, заговор, категория', () => {
    const spell = { ...catalog, category: 'spell', spellLevel: 3 } as const;
    expect(detail({ kind: 'ability', hits: [spell] })).toBe(
      'заклинание · 3 круг',
    );
    expect(
      detail({ kind: 'ability', hits: [{ ...spell, spellLevel: 0 }] }),
    ).toBe('заговор');
    expect(
      detail({
        kind: 'ability',
        hits: [{ ...catalog, category: 'basic', spellLevel: null }],
      }),
    ).toBe('способность');
  });

  it('монстр, предмет, эффект, персонаж и карта', () => {
    expect(
      detail({
        kind: 'monster',
        hits: [{ ...catalog, type: 'elemental', challenge: '5' }],
      }),
    ).toBe('элементаль · ПО 5');
    expect(
      detail({
        kind: 'item',
        hits: [
          { ...catalog, category: 'basic', cost: { amount: 5, coin: 'gp' } },
        ],
      }),
    ).toMatch(/^базовый · 5 /);
    expect(
      detail({
        kind: 'item',
        hits: [{ ...catalog, category: 'quest', cost: null }],
      }),
    ).toBe('сюжетный');
    expect(
      detail({
        kind: 'effect',
        hits: [{ ...catalog, components: ['per_turn', 'speed'] }],
      }),
    ).toBe('урон или лечение за ход и ещё 1');
    expect(
      detail({ kind: 'effect', hits: [{ ...catalog, components: [] }] }),
    ).toBe('эффект');
    const character = { id: 'c', name: 'Эльза', characterKind: 'pc' } as const;
    expect(
      detail({
        kind: 'character',
        hits: [
          {
            ...character,
            classes: [
              { class: 'paladin', level: 3 },
              { class: 'warlock', level: 1 },
            ],
          },
        ],
      }),
    ).toBe('Паладин 3 / Колдун 1');
    expect(
      detail({
        kind: 'character',
        hits: [{ ...character, characterKind: 'npc', classes: [] }],
      }),
    ).toBe('НПС');
    expect(
      detail({
        kind: 'map',
        hits: [{ id: 'm', name: 'Склеп', width: 64, depth: 32 }],
      }),
    ).toBe('64×32');
  });
});

describe('адреса', () => {
  it('запись — на странице её раздела, все результаты — со своим разделом', () => {
    expect(searchHitPath('ability', '1')).toBe('/abilities/1');
    expect(searchHitPath('effect', '1')).toBe('/effects/1');
    expect(searchHitPath('map', '1')).toBe('/maps/1');
    expect(searchPagePath('огн')).toBe('/search?q=%D0%BE%D0%B3%D0%BD');
    expect(searchPagePath('a b', 'item')).toBe('/search?q=a+b&kind=item');
  });
});
