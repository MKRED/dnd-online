import { getBlock } from 'shared';

// Недавние блоки — привычка одного человека, общая для редактора карт и сцены игры:
// запоминаем в браузере.
const STORAGE_KEY = 'maps.recentBlocks';
export const RECENT_LIMIT = 8;

// Хранилище может быть недоступно (приватный режим) или хранить мусор — тогда пусто.
// Блоки, которых уже нет в каталоге, отбрасываем.
export function readRecentBlocks(): string[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((name): name is string => typeof name === 'string')
      .filter((name) => getBlock(name) !== undefined)
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
