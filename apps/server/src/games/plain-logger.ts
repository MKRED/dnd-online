import { PinoLogger } from 'nestjs-pino';
import type { Logger } from 'pino';

// Логгер для простых функций игры, которые не провайдеры (пересчёт тумана, запись
// журнала, ход фигурки): их зовут изнутри транзакций сервисов, и внедрить логгер туда
// нечем. Корневой логгер nestjs-pino появляется, когда поднят LoggerModule; в unit-тестах
// без приложения его нет — тогда замеры просто не пишутся.
export function plainLogger(context: string): Logger | undefined {
  const root = PinoLogger.root as Logger | undefined;
  return root?.child({ context });
}
