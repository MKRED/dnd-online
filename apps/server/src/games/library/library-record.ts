import {
  isCatalogSources,
  type Ability,
  type AbilityLink,
  type CatalogEntryFields,
  type Coin,
  type Effect,
  type EffectLink,
  type GameLibraryKind,
  type Item,
  type ItemCategory,
  type ItemLink,
  type ItemRarity,
  type Monster,
  type PackEntry,
} from 'shared';
import { toAbilityVariant } from '../../abilities/abilities.config.js';
import type { gameLibrary } from '../../database/schema/index.js';
import { toEffectFields } from '../../effects/effects.config.js';
import { toItemVariant } from '../../items/items.mapper.js';
import { toMonsterFields } from '../../monsters/monsters.config.js';
import { readLinks } from './library-links.js';

// Копия из библиотеки — в виде записи справочника (shared), теми же мапперами. Связи
// берутся из той же библиотеки; чего в ней нет — заглушка «скрыто», связь на удалённую
// ещё до копии запись — «удалено».

export type LibraryRow = typeof gameLibrary.$inferSelect;
// Копии, на которые ссылается запись, по ключу libraryKey.
export type LinkedRows = ReadonlyMap<string, LibraryRow>;

export function libraryKey(kind: GameLibraryKind, sourceId: string) {
  return `${kind}:${sourceId}`;
}

export function toLibraryRecord(row: LibraryRow, linked: LinkedRows) {
  switch (row.kind) {
    case 'monster':
      return toMonster(row, linked);
    case 'item':
      return toItem(row, linked);
    case 'ability':
      return toAbility(row, linked);
    case 'effect':
      return toEffect(row);
  }
}

// Поля записи справочника, которых у копии нет: автора нет (только ник), видимость не
// важна — копию видит только мастер.
function entryFields(row: LibraryRow): CatalogEntryFields {
  const sources = row.record.sources;
  return {
    id: row.sourceId,
    authorId: '',
    authorNickname: row.authorNickname,
    isPublic: true,
    name: row.name,
    description:
      typeof row.record.description === 'string' ? row.record.description : '',
    sources: isCatalogSources(sources) ? sources : [],
    image: row.image,
    createdAt: row.copiedAt.toISOString(),
    updatedAt: (row.refreshedAt ?? row.copiedAt).toISOString(),
  };
}

function objectOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function variantArgs(row: LibraryRow) {
  return [
    String(row.record.category),
    objectOf(row.record.details),
    objectOf(row.record.extra),
  ] as const;
}

function toMonster(row: LibraryRow, linked: LinkedRows): Monster {
  const links = readLinks('monster', row.links);
  const find = (kind: GameLibraryKind, sourceId: string | null) =>
    sourceId ? (linked.get(libraryKey(kind, sourceId)) ?? 'hidden') : 'deleted';
  return {
    ...entryFields(row),
    ...toMonsterFields(...variantArgs(row)),
    abilities: links.abilities.map((link, index) => ({
      id: link.sourceId ?? `deleted-${index}`,
      perDay: link.perDay,
      ...abilityLink(find('ability', link.sourceId)),
    })),
    items: links.items.map((link, index) => ({
      id: link.sourceId ?? `deleted-${index}`,
      quantity: link.quantity,
      ...itemLink(find('item', link.sourceId)),
    })),
    effects: links.effects.map((link, index) => ({
      id: link.sourceId ?? `deleted-${index}`,
      ...effectLink(find('effect', link.sourceId)),
    })),
  };
}

function abilityLink(found: LibraryRow | 'hidden' | 'deleted'): AbilityLink {
  if (typeof found === 'string') return { ability: null, missing: found };
  const fields = toAbilityVariant(...variantArgs(found));
  return {
    ability: {
      id: found.sourceId,
      name: found.name,
      isPublic: true,
      image: found.image,
      category: fields.category,
      level: fields.category === 'spell' ? fields.details.level : null,
      activation: fields.activation,
      costs: fields.costs,
      recharge: fields.category === 'monster' ? fields.details.recharge : null,
    },
    missing: null,
    inactive: false,
  };
}

function itemLink(found: LibraryRow | 'hidden' | 'deleted'): ItemLink {
  if (typeof found === 'string') return { item: null, missing: found };
  return {
    item: {
      id: found.sourceId,
      name: found.name,
      category: found.record.category as ItemCategory,
      rarity: found.record.rarity as ItemRarity,
      weight: Number(found.record.weight) || 0,
      isPublic: true,
      image: found.image,
    },
    missing: null,
    inactive: false,
  };
}

function effectLink(found: LibraryRow | 'hidden' | 'deleted'): EffectLink {
  if (typeof found === 'string') return { effect: null, missing: found };
  return {
    effect: {
      id: found.sourceId,
      name: found.name,
      isPublic: true,
      image: found.image,
      ...toEffectFields(...variantArgs(found)),
    },
    missing: null,
    inactive: false,
  };
}

function toItem(row: LibraryRow, linked: LinkedRows): Item {
  const { record } = row;
  // Предмет состава, которого нет в библиотеке, — как скрытый в справочнике: строка без
  // карточки.
  const contents: PackEntry[] = readLinks('item', row.links).pack.map(
    (link) => {
      const found = linked.get(libraryKey('item', link.sourceId));
      return {
        itemId: link.sourceId,
        quantity: link.quantity,
        item: found
          ? {
              name: found.name,
              category: found.record.category as ItemCategory,
              weight: Number(found.record.weight) || 0,
              isPublic: true,
              image: found.image,
            }
          : null,
      };
    },
  );
  const costAmount = record.costAmount;
  const costCoin = record.costCoin;
  return {
    ...entryFields(row),
    ...toItemVariant(
      record.category as ItemCategory,
      objectOf(record.details),
      contents,
    ),
    rarity: record.rarity as ItemRarity,
    weight: Number(record.weight) || 0,
    cost:
      typeof costAmount === 'number' && typeof costCoin === 'string'
        ? { amount: costAmount, coin: costCoin as Coin }
        : null,
  };
}

function toAbility(row: LibraryRow, linked: LinkedRows): Ability {
  const ability: Ability = {
    ...entryFields(row),
    ...toAbilityVariant(...variantArgs(row)),
  };
  for (const link of readLinks('ability', row.links).stepEffects) {
    // Шаг мог не прочитаться (испорченный) — его эффекты некуда положить.
    const step = ability.steps[link.step];
    if (!step) continue;
    const found = linked.get(libraryKey('effect', link.sourceId));
    // Новый список, а не push: у шага по умолчанию список эффектов — общий объект.
    step[link.outcome].effects = [
      ...step[link.outcome].effects,
      {
        effectId: link.sourceId,
        effect: found
          ? { name: found.name, isPublic: true, image: found.image }
          : null,
      },
    ];
  }
  return ability;
}

function toEffect(row: LibraryRow): Effect {
  return { ...entryFields(row), ...toEffectFields(...variantArgs(row)) };
}
