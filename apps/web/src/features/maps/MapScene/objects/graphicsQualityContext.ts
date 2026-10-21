import { createContext, useContext } from 'react';
import { DEFAULT_USER_SETTINGS, type GraphicsQuality } from 'shared';

// Качество графики из настроек пользователя: на «низком» сцена не анимируется (призрак
// над гробом стоит на месте). MapScene кладёт его внутри Canvas, как вид отметки взгляда.
export const GraphicsQualityContext = createContext<GraphicsQuality>(
  DEFAULT_USER_SETTINGS.graphicsQuality,
);

export function useGraphicsQuality(): GraphicsQuality {
  return useContext(GraphicsQualityContext);
}
