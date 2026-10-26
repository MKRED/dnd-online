import {
  Anchor,
  Container,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconChevronLeft } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { Profile } from '../../features/profile';
import { usePageTitle } from '../../lib/usePageTitle';
import AccountSection from './account/AccountSection';
import ApiTokensCard from './ai/ApiTokensCard';
import GraphicsSection from './graphics/GraphicsSection';
import MapSection from './map/MapSection';
import ProfileCard from './ProfileCard';
import classes from './ProfilePage.module.css';
import ProfileNav from './ProfileNav';
import {
  findProfileSection,
  PROFILE_SECTIONS,
  profileSectionPath,
  type ProfileSectionInfo,
  type ProfileSectionKey,
} from './profileSections';
import { useProfile } from './useProfile';

type ProfileState = ReturnType<typeof useProfile>;

const SECTION_BODY: Record<
  ProfileSectionKey,
  (state: ProfileState) => ReactNode
> = {
  account: ({ profile, setProfile }) => (
    <AccountSection
      profile={profile}
      onChange={(next: Profile) => setProfile(next)}
    />
  ),
  map: () => <MapSection />,
  graphics: () => <GraphicsSection />,
  ai: () => <ApiTokensCard />,
};

// Профиль по разделам (profileSections.ts), вариант «Настройки списком» (выбран
// пользователем 2026-10-24). На широком экране слева карточка игрока и меню, справа
// открытый раздел; на телефоне /profile — карточка и список разделов, /profile/:section —
// один раздел со ссылкой назад: строка вкладок разрослась бы, как когда-то шапка.
function ProfilePage() {
  const { section: param } = useParams();
  const section = findProfileSection(param);
  const state = useProfile();
  // Сразу, без эффекта: иначе первый кадр на широком экране был бы телефонным.
  const wide = useMediaQuery('(min-width: 62em)', false, {
    getInitialValueInEffect: false,
  });
  usePageTitle(section ? `Профиль · ${section.label}` : 'Профиль');

  if (param && !section) return <Navigate to="/profile" replace />;
  // На широком экране раздел открыт всегда; без него в адресе — первый.
  if (wide && !section)
    return (
      <Navigate to={profileSectionPath(PROFILE_SECTIONS[0].key)} replace />
    );

  if (!wide)
    return (
      <Container size="sm" py="xl">
        {section ? (
          <Stack gap="lg">
            <Anchor
              component={Link}
              to="/profile"
              size="sm"
              className={classes.back}
            >
              <IconChevronLeft size={16} stroke={1.8} />
              Профиль
            </Anchor>
            <SectionView section={section} state={state} />
          </Stack>
        ) : (
          <Stack gap="lg">
            <VisuallyHidden component="h1">Профиль</VisuallyHidden>
            <ProfileCard profile={state.profile} error={state.error} />
            <ProfileNav active={null} />
          </Stack>
        )}
      </Container>
    );

  if (!section) return null;
  return (
    <Container size="lg" py="xl">
      <div className={classes.layout}>
        <aside className={classes.aside}>
          <ProfileCard profile={state.profile} error={state.error} />
          <ProfileNav active={section.key} />
        </aside>
        <SectionView section={section} state={state} />
      </div>
    </Container>
  );
}

function SectionView({
  section,
  state,
}: {
  section: ProfileSectionInfo;
  state: ProfileState;
}) {
  return (
    <section aria-labelledby="profile-section-title" className={classes.body}>
      <Title order={1} fz={{ base: 22, sm: 26 }} id="profile-section-title">
        {section.label}
      </Title>
      <Text c="dimmed" mt={6} mb="lg">
        {section.hint}
      </Text>
      {SECTION_BODY[section.key](state)}
    </section>
  );
}

export default ProfilePage;
