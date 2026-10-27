import type {
  EquipSlot,
  GameLibraryKind,
  GameLibraryRef,
  InventoryLocation,
} from 'shared';

// Связи копии исходными id (docs/plan/done/game.md, этап 4). Копия связей не держит внешних
// ключей: связь ищется в библиотеке той же игры, а чего там нет — заглушка. null — запись
// по связи удалили в справочнике ещё до копии (строка-заглушка монстра).
export interface MonsterLinks {
  abilities: { sourceId: string | null; perDay: number | null }[];
  items: { sourceId: string | null; quantity: number }[];
  effects: { sourceId: string | null }[];
}

// Эффекты шагов способности в порядке автора внутри исхода.
export interface AbilityLinks {
  stepEffects: { step: number; outcome: 'hit' | 'miss'; sourceId: string }[];
}

// Лист НПС: предметы с местом, способности с отметкой «подготовлено», эффекты — как в
// листе персонажа. null — запись удалили в справочнике ещё до копии. Места куклы и
// настройка — с этапа 4 плана экипировки: у копий старше их нет, читаются как «не надето».
export interface NpcLinks {
  items: {
    sourceId: string | null;
    quantity: number;
    location: InventoryLocation;
    equipped?: EquipSlot[];
    attuned?: boolean;
  }[];
  abilities: { sourceId: string | null; prepared: boolean }[];
  effects: { sourceId: string | null }[];
}

// Состав набора; у остальных предметов пуст.
export interface ItemLinks {
  pack: { sourceId: string; quantity: number }[];
}

export interface LibraryLinks {
  monster: MonsterLinks;
  npc: NpcLinks;
  ability: AbilityLinks;
  item: ItemLinks;
  effect: Record<string, never>;
}

const EMPTY_LINKS: { [K in GameLibraryKind]: () => LibraryLinks[K] } = {
  monster: () => ({ abilities: [], items: [], effects: [] }),
  npc: () => ({ items: [], abilities: [], effects: [] }),
  ability: () => ({ stepEffects: [] }),
  item: () => ({ pack: [] }),
  effect: () => ({}),
};

export function emptyLinks<K extends GameLibraryKind>(
  kind: K,
): LibraryLinks[K] {
  return EMPTY_LINKS[kind]();
}

// Связи из jsonb. Пишет их только сервер, поэтому проверка — лишь от строк старой формы:
// недостающий список читается пустым.
export function readLinks<K extends GameLibraryKind>(
  kind: K,
  stored: Record<string, unknown>,
): LibraryLinks[K] {
  const empty = emptyLinks(kind);
  const links: Record<string, unknown> = { ...empty };
  for (const key of Object.keys(empty)) {
    if (Array.isArray(stored[key])) links[key] = stored[key];
  }
  return links as LibraryLinks[K];
}

// На что ссылается копия — это копируется вместе с ней.
export function linkedRefs(
  kind: GameLibraryKind,
  stored: LibraryLinks[GameLibraryKind],
): GameLibraryRef[] {
  const refs: GameLibraryRef[] = [];
  const add = (target: GameLibraryKind, sourceId: string | null) => {
    if (sourceId) refs.push({ kind: target, sourceId });
  };
  // У монстра и НПС связи одной формы: способности, предметы, эффекты.
  if (kind === 'monster' || kind === 'npc') {
    const links = stored as MonsterLinks | NpcLinks;
    for (const link of links.abilities) add('ability', link.sourceId);
    for (const link of links.items) add('item', link.sourceId);
    for (const link of links.effects) add('effect', link.sourceId);
  } else if (kind === 'ability') {
    for (const link of (stored as AbilityLinks).stepEffects)
      add('effect', link.sourceId);
  } else if (kind === 'item') {
    for (const link of (stored as ItemLinks).pack) add('item', link.sourceId);
  }
  return refs;
}
