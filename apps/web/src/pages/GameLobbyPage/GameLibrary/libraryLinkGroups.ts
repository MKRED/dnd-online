import type { EffectLink, GameLibraryEntry, GameLibraryKind } from 'shared';

// Связь копии строкой карточки: открыть её можно, если она есть в библиотеке.
export interface LibraryLink {
  key: string;
  kind: GameLibraryKind;
  // null — связи нет в библиотеке: удалена до копии или скрыта от владельца.
  sourceId: string | null;
  name: string | null;
  // «×2», «2/день» — то, что лежит на самой связи.
  note: string | null;
}

export interface LibraryLinkGroup {
  title: string;
  links: LibraryLink[];
}

function effectLinks(effects: ({ id: string } & EffectLink)[]): LibraryLink[] {
  return effects.map((link) => ({
    key: link.id,
    kind: 'effect',
    sourceId: link.effect?.id ?? null,
    name: link.effect?.name ?? null,
    note: null,
  }));
}

// Связи копии по группам, как в карточке справочника: способности, снаряжение и эффекты
// монстра; способности, предметы и эффекты НПС, как в его листе; состав набора; эффекты
// шагов способности (один раз, даже если в нескольких).
export function libraryLinkGroups(entry: GameLibraryEntry): LibraryLinkGroup[] {
  const groups: LibraryLinkGroup[] = [];
  const add = (title: string, links: LibraryLink[]) => {
    if (links.length > 0) groups.push({ title, links });
  };
  if (entry.kind === 'monster') {
    const { abilities = [], items = [], effects = [] } = entry.record;
    add(
      'Способности',
      abilities.map((link) => ({
        key: link.id,
        kind: 'ability',
        sourceId: link.ability?.id ?? null,
        name: link.ability?.name ?? null,
        note: link.perDay === null ? null : `${link.perDay}/день`,
      })),
    );
    add(
      'Снаряжение',
      items.map((link) => ({
        key: link.id,
        kind: 'item',
        sourceId: link.item?.id ?? null,
        name: link.item?.name ?? null,
        note: `×${link.quantity}`,
      })),
    );
    add('Эффекты', effectLinks(effects));
  }
  if (entry.kind === 'npc') {
    const { abilities, inventory, effects } = entry.record;
    add(
      'Способности',
      abilities.map((link) => ({
        key: link.id,
        kind: 'ability',
        sourceId: link.ability?.id ?? null,
        name: link.ability?.name ?? null,
        note: null,
      })),
    );
    add(
      'Предметы',
      // Один предмет может лежать и при себе, и в хранилище — ключ с местом.
      inventory.map((row) => ({
        key: `${row.id}:${row.location}`,
        kind: 'item',
        sourceId: row.item?.id ?? null,
        name: row.item?.name ?? null,
        note:
          row.location === 'stash'
            ? `×${row.quantity}, в хранилище`
            : `×${row.quantity}`,
      })),
    );
    add('Эффекты', effectLinks(effects));
  }
  if (entry.kind === 'item' && entry.record.category === 'pack') {
    add(
      'Состав',
      entry.record.details.contents.map((row) => ({
        key: row.itemId,
        kind: 'item',
        sourceId: row.item ? row.itemId : null,
        name: row.item?.name ?? null,
        note: `×${row.quantity}`,
      })),
    );
  }
  if (entry.kind === 'ability') {
    const seen = new Set<string>();
    const links: LibraryLink[] = [];
    for (const step of entry.record.steps)
      for (const { effectId, effect } of [
        ...step.hit.effects,
        ...step.miss.effects,
      ]) {
        if (seen.has(effectId)) continue;
        seen.add(effectId);
        links.push({
          key: effectId,
          kind: 'effect',
          sourceId: effect ? effectId : null,
          name: effect?.name ?? null,
          note: null,
        });
      }
    add('Эффекты шагов', links);
  }
  return groups;
}
