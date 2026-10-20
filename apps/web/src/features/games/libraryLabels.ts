import {
  MONSTER_TYPE_LABELS,
  type GameLibraryKind,
  type GameLibrarySource,
  type ItemCategory,
  type MonsterType,
} from 'shared';
import { CATEGORY_LABELS as ITEM_CATEGORY_LABELS } from '../items/itemLabels';
import { ABILITIES } from '../simpleCatalog/simpleCatalogs';

// Подписи библиотеки игры.

export const LIBRARY_KIND_LABELS: Record<GameLibraryKind, string> = {
  monster: 'Монстр',
  npc: 'НПС',
  item: 'Предмет',
  ability: 'Способность',
  effect: 'Эффект',
};

// Чипы над списком — во множественном числе.
export const LIBRARY_KIND_CHIPS: Record<GameLibraryKind, string> = {
  monster: 'Монстры',
  npc: 'НПС',
  item: 'Предметы',
  ability: 'Способности',
  effect: 'Эффекты',
};

// Бейдж сверки со справочником; у совпадающей копии бейджа нет.
export const LIBRARY_SOURCE_LABELS: Record<
  Exclude<GameLibrarySource, 'same'>,
  string
> = {
  changed: 'Изменена в справочнике',
  missing: 'Нет в справочнике',
};

// Вид записи и её категория одной строкой: «Предмет · Оружие». У эффекта и НПС категории
// нет.
export function libraryKindLine(
  kind: GameLibraryKind,
  category: string,
): string {
  const kindLabel = LIBRARY_KIND_LABELS[kind];
  const categoryLabel =
    kind === 'monster'
      ? MONSTER_TYPE_LABELS[category as MonsterType]
      : kind === 'item'
        ? ITEM_CATEGORY_LABELS[category as ItemCategory]
        : kind === 'ability'
          ? ABILITIES.kinds.labels[category]
          : undefined;
  return categoryLabel ? `${kindLabel} · ${categoryLabel}` : kindLabel;
}
