import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ABILITY_FIELDS,
  DEFAULT_EFFECT_DURATION,
  type GameLibraryEntry,
} from 'shared';
import { sampleCharacter } from '../../../test/characterFixture';
import { sampleMonster } from '../../../test/monsterFixture';
import { libraryLinkGroups } from './libraryLinkGroups';

const copy = {
  sourceId: 's1',
  name: 'Копия',
  category: 'basic',
  image: null,
  copiedAt: '2026-10-20T10:00:00.000Z',
  refreshedAt: null,
  source: 'same' as const,
};
const effectCard = {
  id: 'e1',
  name: 'Ожог',
  isPublic: true,
  image: null,
  equip: null,
  components: [],
  duration: DEFAULT_EFFECT_DURATION,
  saveEnds: null,
};

describe('libraryLinkGroups', () => {
  it('монстр: способности с частотой, снаряжение с количеством, заглушки', () => {
    const entry: GameLibraryEntry = {
      ...copy,
      kind: 'monster',
      record: {
        ...sampleMonster,
        abilities: [
          {
            id: 'a1',
            perDay: 2,
            ability: {
              id: 'a1',
              name: 'Укус',
              isPublic: true,
              image: null,
              category: 'basic',
              level: null,
              activation: DEFAULT_ABILITY_FIELDS.activation,
              costs: DEFAULT_ABILITY_FIELDS.costs,
              recharge: null,
              passive: [],
            },
            missing: null,
            inactive: false,
          },
        ],
        items: [{ id: 'i1', quantity: 3, item: null, missing: 'hidden' }],
        effects: [
          { id: 'e1', effect: effectCard, missing: null, inactive: false },
        ],
      },
    };
    expect(libraryLinkGroups(entry)).toEqual([
      {
        title: 'Способности',
        links: [
          {
            key: 'a1',
            kind: 'ability',
            sourceId: 'a1',
            name: 'Укус',
            note: '2/день',
          },
        ],
      },
      {
        title: 'Снаряжение',
        links: [
          { key: 'i1', kind: 'item', sourceId: null, name: null, note: '×3' },
        ],
      },
      {
        title: 'Эффекты',
        links: [
          {
            key: 'e1',
            kind: 'effect',
            sourceId: 'e1',
            name: 'Ожог',
            note: null,
          },
        ],
      },
    ]);
  });

  it('НПС: предметы с местом и количеством, один предмет в двух местах', () => {
    const entry: GameLibraryEntry = {
      ...copy,
      kind: 'npc',
      category: 'npc',
      record: {
        ...sampleCharacter,
        kind: 'npc',
        abilities: [],
        inventory: [
          {
            id: 'i1',
            location: 'carried',
            quantity: 1,
            equipped: [],
            attuned: false,
            item: {
              id: 'i1',
              name: 'Самоцвет',
              category: 'treasure',
              rarity: 'none',
              weight: 0,
              isPublic: true,
              image: null,
              equip: null,
            },
            missing: null,
            inactive: false,
          },
          {
            id: 'i1',
            location: 'stash',
            quantity: 4,
            equipped: [],
            attuned: false,
            item: {
              id: 'i1',
              name: 'Самоцвет',
              category: 'treasure',
              rarity: 'none',
              weight: 0,
              isPublic: true,
              image: null,
              equip: null,
            },
            missing: null,
            inactive: false,
          },
        ],
        effects: [{ id: 'e1', effect: null, missing: 'deleted' }],
      },
    };
    expect(libraryLinkGroups(entry)).toEqual([
      {
        title: 'Предметы',
        links: [
          {
            key: 'i1:carried',
            kind: 'item',
            sourceId: 'i1',
            name: 'Самоцвет',
            note: '×1',
          },
          {
            key: 'i1:stash',
            kind: 'item',
            sourceId: 'i1',
            name: 'Самоцвет',
            note: '×4, в хранилище',
          },
        ],
      },
      {
        title: 'Эффекты',
        links: [
          { key: 'e1', kind: 'effect', sourceId: null, name: null, note: null },
        ],
      },
    ]);
  });

  it('способность: эффекты шагов по одному разу, без групп — пусто', () => {
    const step = {
      hit: { effects: [{ effectId: 'e1', effect: effectCard }] },
      miss: { effects: [{ effectId: 'e1', effect: effectCard }] },
    };
    const entry = {
      ...copy,
      kind: 'ability',
      record: { steps: [step, step] },
    } as unknown as GameLibraryEntry;
    expect(libraryLinkGroups(entry)).toEqual([
      {
        title: 'Эффекты шагов',
        links: [
          {
            key: 'e1',
            kind: 'effect',
            sourceId: 'e1',
            name: 'Ожог',
            note: null,
          },
        ],
      },
    ]);
    const plain = {
      ...copy,
      kind: 'effect',
      record: effectCard,
    } as unknown as GameLibraryEntry;
    expect(libraryLinkGroups(plain)).toEqual([]);
  });
});
