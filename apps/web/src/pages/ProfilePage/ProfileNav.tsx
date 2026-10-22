import { NavLink } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import {
  PROFILE_SECTIONS,
  profileSectionPath,
  type ProfileSectionKey,
} from './profileSections';

interface ProfileNavProps {
  // Открытый раздел; null — список разделов на телефоне, где открытого нет, а у
  // каждого пункта стрелка: раздел откроется отдельным экраном.
  active: ProfileSectionKey | null;
}

// Меню разделов: на широком экране — колонка слева, на телефоне — первый экран
// профиля, как список настроек телефона.
function ProfileNav({ active }: ProfileNavProps) {
  return (
    <nav aria-label="Разделы профиля">
      {PROFILE_SECTIONS.map(({ key, label, hint, icon: Icon }) => (
        <NavLink
          key={key}
          component={Link}
          to={profileSectionPath(key)}
          label={label}
          description={hint}
          leftSection={<Icon size={22} stroke={1.6} />}
          rightSection={
            active === null && <IconChevronRight size={16} stroke={1.6} />
          }
          active={key === active}
          variant="light"
          py="sm"
          style={{ borderRadius: 'var(--mantine-radius-md)' }}
        />
      ))}
    </nav>
  );
}

export default ProfileNav;
