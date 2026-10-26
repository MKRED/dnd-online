import {
  AIR_NAME,
  CONTAINER_LOOK_LABELS,
  CONTAINER_LOOKS,
  isKnownBlockName,
  type ContainerLook,
} from 'shared';
import { readRecentBlocks } from '../BlockPicker/recentBlocks';
import type { CatalogChoice, ObjectChoice } from '../objects/objectPlacement';

export type { ObjectChoice };

// Недавнее в окне и в панели — блоки и объекты вперемешку, как их выбирали.
export type RecentPlace =
  { type: 'block'; name: string } | { type: 'object'; choice: ObjectChoice };

export const recentKey = (recent: RecentPlace): string =>
  recent.type === 'block'
    ? `block:${recent.name}`
    : recent.choice.kind === 'start'
      ? 'start'
      : recent.choice.kind === 'container'
        ? `container:${recent.choice.look}`
        : `${recent.choice.entry.kind}:${recent.choice.entry.id}`;

export function objectChoiceLabel(choice: ObjectChoice): string {
  switch (choice.kind) {
    case 'start':
      return 'Точка старта';
    case 'container':
      return CONTAINER_LOOK_LABELS[choice.look];
    default:
      return choice.entry.label;
  }
}

// Плитка окна пишет имя и под ним, приглушённо, остальное из подписи: размер и крепление
// обстановки, размер монстра. У НПС подписи нет — пишем, что это НПС.
export function objectChoiceName(choice: ObjectChoice): string {
  return 'entry' in choice ? choice.entry.name : objectChoiceLabel(choice);
}

export function objectChoiceMeta(choice: ObjectChoice): string {
  if (!('entry' in choice)) return '';
  const { name, label, kind } = choice.entry;
  if (kind === 'npc') return 'НПС';
  const prefix = `${name} · `;
  return label.startsWith(prefix) ? label.slice(prefix.length) : '';
}

// Метка вида в углу картинки — в недавних, где блоки и объекты вперемешку.
const KIND_BADGES: Record<ObjectChoice['kind'], string> = {
  start: 'старт',
  container: 'конт.',
  furniture: 'обст.',
  item: 'предм.',
  creature: 'сущ.',
};

export const objectChoiceBadge = (choice: ObjectChoice) =>
  KIND_BADGES[choice.kind];

// Недавние — привычка одного человека, общая для редактора карт и сцены игры: в браузере.
// До этапа 10 помнили только блоки — с них и начинаем.
const STORAGE_KEY = 'maps.recentPlace';
export const RECENT_PLACE_LIMIT = 12;

const isCatalogChoice = (value: unknown): value is CatalogChoice => {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    ['monster', 'npc', 'item', 'furniture'].includes(entry.kind as string) &&
    typeof entry.id === 'string' &&
    typeof entry.name === 'string' &&
    typeof entry.label === 'string'
  );
};

function isRecentPlace(value: unknown): value is RecentPlace {
  if (typeof value !== 'object' || value === null) return false;
  const recent = value as Record<string, unknown>;
  if (recent.type === 'block')
    return (
      typeof recent.name === 'string' &&
      recent.name !== AIR_NAME &&
      isKnownBlockName(recent.name)
    );
  if (recent.type !== 'object') return false;
  const choice = recent.choice as Record<string, unknown> | null;
  if (!choice) return false;
  if (choice.kind === 'start') return true;
  if (choice.kind === 'container')
    return CONTAINER_LOOKS.includes(choice.look as ContainerLook);
  return (
    ['creature', 'item', 'furniture'].includes(choice.kind as string) &&
    isCatalogChoice(choice.entry)
  );
}

// Хранилище может быть недоступно (приватный режим) или хранить мусор — тогда пусто.
export function readRecentPlace(): RecentPlace[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null)
      return readRecentBlocks().map((name) => ({ type: 'block', name }));
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter(isRecentPlace).slice(0, RECENT_PLACE_LIMIT)
      : [];
  } catch (err: unknown) {
    console.error('Failed to read recent placements', err);
    return [];
  }
}

export function saveRecentPlace(list: readonly RecentPlace[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err: unknown) {
    console.error('Failed to remember recent placements', err);
  }
}

// Выбранное — первым, без повторов, не больше RECENT_PLACE_LIMIT.
export function withRecentPlace(
  list: readonly RecentPlace[],
  recent: RecentPlace,
): RecentPlace[] {
  const key = recentKey(recent);
  return [recent, ...list.filter((other) => recentKey(other) !== key)].slice(
    0,
    RECENT_PLACE_LIMIT,
  );
}
