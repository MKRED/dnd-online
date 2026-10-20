import { createContext, useContext } from 'react';
import { DEFAULT_USER_SETTINGS, type FacingMarker } from 'shared';

// Вид отметки взгляда из настроек пользователя. MapScene кладёт его внутри Canvas,
// чтобы не тянуть пропом через слой объектов до каждой подставки.
export const FacingMarkerContext = createContext<FacingMarker>(
  DEFAULT_USER_SETTINGS.facingMarker,
);

export function useFacingMarker(): FacingMarker {
  return useContext(FacingMarkerContext);
}
