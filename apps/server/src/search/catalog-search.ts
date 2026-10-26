import { and, eq, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import {
  effectComponentKinds,
  type AbilitySearchHit,
  type EffectSearchHit,
  type ItemSearchHit,
  type MonsterSearchHit,
} from 'shared';
import {
  ABILITY_ACCESS,
  toAbilityVariant,
} from '../abilities/abilities.config.js';
import {
  entryVisibleTo,
  type CatalogAccess,
  type Db,
} from '../catalog/catalog-access.js';
import { byNameMatch, nameContains } from '../catalog/name-match.js';
import {
  abilities,
  effects,
  items,
  monsters,
  users,
} from '../database/schema/index.js';
import { EFFECT_ACCESS, toEffectFields } from '../effects/effects.config.js';
import { ITEM_ACCESS } from '../items/item-access.js';
import {
  MONSTER_ACCESS,
  toMonsterFields,
} from '../monsters/monsters.config.js';
import { totalCount, type Found, type SearchParams } from './search-params.js';

// Записи справочника в поиске — те же, что игрок видит в разделе: свои (и скрытые) и
// чужие опубликованные.

// Поля, общие для всех каталогов: кто автор и сколько нашлось всего. id и name — в каждой
// выборке своими колонками: через общий PgColumn пропал бы их тип.
function commonFields(access: CatalogAccess, userId: string) {
  return {
    mine: sql<boolean>`${access.authorId} = ${userId}`,
    authorNickname: users.nickname,
    total: totalCount(),
  };
}

function visibleMatch(
  access: CatalogAccess,
  name: PgColumn,
  { userId, q }: SearchParams,
) {
  return and(entryVisibleTo(access, userId), nameContains(name, q));
}

export async function searchAbilities(
  db: Db,
  params: SearchParams,
): Promise<Found<AbilitySearchHit>> {
  const rows = await db
    .select({
      id: abilities.id,
      name: abilities.name,
      ...commonFields(ABILITY_ACCESS, params.userId),
      category: abilities.category,
      details: abilities.details,
    })
    .from(abilities)
    .innerJoin(users, eq(users.id, abilities.authorId))
    .where(visibleMatch(ABILITY_ACCESS, abilities.name, params))
    .orderBy(...byNameMatch(abilities.name, abilities.id, params.q))
    .limit(params.limit);
  return rows.map(({ category, details, ...row }) => {
    // Шаги и затраты поиску не нужны: extra не читаем, категория и круг — из details.
    const variant = toAbilityVariant(category, details, {});
    return {
      ...row,
      category: variant.category,
      spellLevel: variant.category === 'spell' ? variant.details.level : null,
    };
  });
}

export async function searchMonsters(
  db: Db,
  params: SearchParams,
): Promise<Found<MonsterSearchHit>> {
  const rows = await db
    .select({
      id: monsters.id,
      name: monsters.name,
      ...commonFields(MONSTER_ACCESS, params.userId),
      category: monsters.category,
      extra: monsters.extra,
    })
    .from(monsters)
    .innerJoin(users, eq(users.id, monsters.authorId))
    .where(visibleMatch(MONSTER_ACCESS, monsters.name, params))
    .orderBy(...byNameMatch(monsters.name, monsters.id, params.q))
    .limit(params.limit);
  return rows.map(({ category, extra, ...row }) => {
    const fields = toMonsterFields(category, {}, extra);
    return {
      ...row,
      type: fields.category,
      challenge: fields.statBlock.challenge,
    };
  });
}

export async function searchItems(
  db: Db,
  params: SearchParams,
): Promise<Found<ItemSearchHit>> {
  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      ...commonFields(ITEM_ACCESS, params.userId),
      category: items.category,
      costAmount: items.costAmount,
      costCoin: items.costCoin,
    })
    .from(items)
    .innerJoin(users, eq(users.id, items.authorId))
    .where(visibleMatch(ITEM_ACCESS, items.name, params))
    .orderBy(...byNameMatch(items.name, items.id, params.q))
    .limit(params.limit);
  return rows.map(({ costAmount, costCoin, ...row }) => ({
    ...row,
    cost:
      costAmount !== null && costCoin !== null
        ? { amount: costAmount, coin: costCoin }
        : null,
  }));
}

export async function searchEffects(
  db: Db,
  params: SearchParams,
): Promise<Found<EffectSearchHit>> {
  const rows = await db
    .select({
      id: effects.id,
      name: effects.name,
      ...commonFields(EFFECT_ACCESS, params.userId),
      category: effects.category,
      details: effects.details,
    })
    .from(effects)
    .innerJoin(users, eq(users.id, effects.authorId))
    .where(visibleMatch(EFFECT_ACCESS, effects.name, params))
    .orderBy(...byNameMatch(effects.name, effects.id, params.q))
    .limit(params.limit);
  return rows.map(({ category, details, ...row }) => ({
    ...row,
    components: effectComponentKinds(
      toEffectFields(category, details, {}).components,
    ),
  }));
}
