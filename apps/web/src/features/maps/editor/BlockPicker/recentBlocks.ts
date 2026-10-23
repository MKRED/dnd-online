import { AIR_NAME, isKnownBlockName, type BlockCatalog } from 'shared';

// Недавние блоки — привычка одного человека, общая для редактора карт и сцены игры:
// запоминаем в браузере.
const STORAGE_KEY = 'maps.recentBlocks';
export const RECENT_LIMIT = 8;

// Хранилище может быть недоступно (приватный режим) или хранить мусор — тогда пусто.
// Отбрасываем только то, что не похоже на имя блока: свой блок есть в каталоге одной
// карты и нет в другой, поэтому недавние показывают по каталогу карты (shownRecent).
export function readRecentBlocks(): string[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((name): name is string => typeof name === 'string')
      .filter((name) => name !== AIR_NAME && isKnownBlockName(name))
      .slice(0, RECENT_LIMIT);
  } catch (err: unknown) {
    console.error('Failed to read recent blocks', err);
    return [];
  }
}

export function saveRecentBlocks(names: readonly string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch (err: unknown) {
    console.error('Failed to remember recent blocks', err);
  }
}

// Выбранный блок — первым, без повторов, не больше RECENT_LIMIT.
export function withRecent(names: readonly string[], name: string): string[] {
  return [name, ...names.filter((other) => other !== name)].slice(
    0,
    RECENT_LIMIT,
  );
}

// Недавние, которые есть в каталоге этой карты: свои блоки другого владельца и
// удалённые группы не показываем.
export function shownRecent(
  names: readonly string[],
  catalog: BlockCatalog,
): string[] {
  return names.filter((name) => catalog.describe(name) !== undefined);
}
