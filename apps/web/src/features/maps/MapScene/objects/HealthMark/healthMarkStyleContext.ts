import { createContext, useContext } from 'react';
import {
  DEFAULT_USER_SETTINGS,
  HEALTH_MARK_STYLES,
  type HealthMarkStyle,
} from 'shared';

// Вид метки здоровья из настроек пользователя. MapScene кладёт его внутри Canvas, как
// качество графики.
export const HealthMarkStyleContext = createContext<HealthMarkStyle>(
  DEFAULT_USER_SETTINGS.healthMarkStyle,
);

// Настройки, прочитанные до выхода этого поля (вкладка, открытая до обновления сервера),
// его не знают — тогда вид по умолчанию.
export function useHealthMarkStyle(): HealthMarkStyle {
  const style = useContext(HealthMarkStyleContext);
  return HEALTH_MARK_STYLES.includes(style)
    ? style
    : DEFAULT_USER_SETTINGS.healthMarkStyle;
}
