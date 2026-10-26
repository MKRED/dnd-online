import {
  IconArmchair,
  IconBackpack,
  IconBox,
  IconFlame,
  IconHome,
  IconMap,
  IconSkull,
  IconSparkles,
  IconStar,
  IconSwords,
  IconUsers,
  IconWall,
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
  blocks: IconWall,
  models: IconBox,
  furniture: IconArmchair,
};

// Разделы боковой панели. Новый раздел добавляется сюда, шапку он не трогает.
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/', label: 'Главная', icon: IconHome },
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
// Главная — только сама: с «/» начинается любой адрес.
export function isNavActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}
