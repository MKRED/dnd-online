import {
  IconBackpack,
  IconFlame,
  IconMap,
  IconSkull,
  IconSparkles,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import type { SearchKind } from 'shared';

// Те же значки, что у разделов в боковой панели (components/AppLayout/navItems.ts).
export const SEARCH_ICONS: Record<SearchKind, Icon> = {
  ability: IconSparkles,
  monster: IconSkull,
  character: IconUsers,
  item: IconBackpack,
  effect: IconFlame,
  map: IconMap,
};
