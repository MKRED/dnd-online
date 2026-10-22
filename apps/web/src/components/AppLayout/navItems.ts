import {
  IconBackpack,
  IconCube,
  IconFlame,
  IconMap,
  IconSkull,
  IconSparkles,
  IconStar,
  IconSwords,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { CATALOG_SECTIONS, type CatalogSection } from '../../features/catalog';

export interface NavItem {
  to: string;
  label: string;
  icon: Icon;
}

export interface NavGroup {
  // Подпись группы; у групп без подписи — только разделитель в свёрнутой панели.
  label?: string;
  items: NavItem[];
}

const CATALOG_ICONS: Record<CatalogSection, Icon> = {
  items: IconBackpack,
  abilities: IconSparkles,
  effects: IconFlame,
  monsters: IconSkull,
  blocks: IconCube,
};

// Разделы боковой панели. Новый раздел добавляется сюда, шапку он не трогает.
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/games', label: 'Игры', icon: IconSwords },
      { to: '/characters', label: 'Персонажи', icon: IconUsers },
      { to: '/maps', label: 'Карты', icon: IconMap },
    ],
  },
  {
    label: 'Справочник',
    items: CATALOG_SECTIONS.map(({ value, path, label }) => ({
      to: path,
      label,
      icon: CATALOG_ICONS[value],
    })),
  },
  { items: [{ to: '/bookmarks', label: 'Закладки', icon: IconStar }] },
];

// Раздел подсвечен и на своих вложенных страницах: /characters/123/edit — «Персонажи».
export function isNavActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}
