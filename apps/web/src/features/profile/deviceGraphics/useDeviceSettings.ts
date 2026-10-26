import { useMemo, useSyncExternalStore } from 'react';
import { DEFAULT_USER_SETTINGS, type UserSettings } from 'shared';
import { useAuth } from '../../auth';
import {
  isPhone,
  startingGraphics,
  storedGraphics,
  subscribeGraphics,
  type DeviceGraphics,
} from './deviceGraphics';

// Графика этого устройства, пока своей нет — та, с которой оно начинает. Тот же объект,
// пока ничего не менялось: от него зависят контексты сцены.
export function useDeviceGraphics(): DeviceGraphics {
  const account = useAuth().user?.settings ?? DEFAULT_USER_SETTINGS;
  const stored = useSyncExternalStore(subscribeGraphics, storedGraphics);
  return useMemo(
    () => stored ?? startingGraphics(account, isPhone()),
    [stored, account],
  );
}

// Настройки для карты и сцены: метки — из аккаунта, графика — этого устройства.
export function useDeviceSettings(): UserSettings {
  const account = useAuth().user?.settings ?? DEFAULT_USER_SETTINGS;
  const graphics = useDeviceGraphics();
  return useMemo(() => ({ ...account, ...graphics }), [account, graphics]);
}
