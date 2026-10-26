import {
  IconMap2,
  IconPhoto,
  IconRobot,
  IconUserCircle,
  type Icon,
} from '@tabler/icons-react';

export type ProfileSectionKey = 'account' | 'map' | 'graphics' | 'ai';

export interface ProfileSectionInfo {
  key: ProfileSectionKey;
  label: string;
  // Одна строка под названием: в меню и под заголовком раздела.
  hint: string;
  icon: Icon;
}

// Разделы профиля по порядку. Раздел — часть адреса (/profile/map), чтобы на него
// можно было сослаться и чтобы «Назад» браузера возвращал к списку на телефоне.
export const PROFILE_SECTIONS: ProfileSectionInfo[] = [
  {
    key: 'account',
    label: 'Аккаунт',
    hint: 'Как вас видят другие игроки и как вы входите',
    icon: IconUserCircle,
  },
  {
    key: 'map',
    label: 'Карта и игра',
    hint: 'Как показаны взгляд и здоровье существ',
    icon: IconMap2,
  },
  {
    key: 'graphics',
    label: 'Графика',
    hint: 'Насколько подробно рисуются карта и сцена на этом устройстве',
    icon: IconPhoto,
  },
  {
    key: 'ai',
    label: 'Нейросеть',
    hint: 'Токены для MCP-серверов',
    icon: IconRobot,
  },
];

export const profileSectionPath = (key: ProfileSectionKey) => `/profile/${key}`;

export const findProfileSection = (key: string | undefined) =>
  PROFILE_SECTIONS.find((section) => section.key === key);
