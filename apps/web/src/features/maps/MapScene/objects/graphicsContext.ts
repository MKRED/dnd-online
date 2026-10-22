import { createContext, useContext } from 'react';
import { DEFAULT_USER_SETTINGS, type GraphicsSettings } from 'shared';

// Графика из настроек пользователя: частота анимаций (0 — призрак над гробом стоит на
// месте) и у кого на карте 3D-модели. MapScene кладёт её внутри Canvas, как вид отметки
// взгляда.
export const GraphicsContext = createContext<GraphicsSettings>(
  DEFAULT_USER_SETTINGS,
);

export function useGraphics(): GraphicsSettings {
  return useContext(GraphicsContext);
}
