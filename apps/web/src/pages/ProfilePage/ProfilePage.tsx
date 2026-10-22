import { Anchor, Container, Stack, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconChevronLeft } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../../lib/usePageTitle';
import AccountSection from './account/AccountSection';
import ApiTokensCard from './ai/ApiTokensCard';
import GraphicsSection from './graphics/GraphicsSection';
import MapSection from './map/MapSection';
import classes from './ProfilePage.module.css';
import ProfileNav from './ProfileNav';
import {
  findProfileSection,
  PROFILE_SECTIONS,
  profileSectionPath,
  type ProfileSectionInfo,
  type ProfileSectionKey,
} from './profileSections';

const SECTION_BODY: Record<ProfileSectionKey, () => ReactNode> = {
  account: () => <AccountSection />,
  map: () => <MapSection />,
  graphics: () => <GraphicsSection />,
  ai: () => <ApiTokensCard />,
};

// Профиль по разделам (profileSections.ts). На широком экране меню слева и открытый
// раздел справа; на телефоне /profile — список разделов, /profile/:section — один
// раздел со ссылкой назад: строка вкладок разрослась бы, как когда-то шапка.
function ProfilePage() {
  const { section: param } = useParams();
  const section = findProfileSection(param);
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
            <SectionView section={section} />
          </Stack>
        ) : (
          <>
            <Title order={1} mb="lg">
              Профиль
            </Title>
            <ProfileNav active={null} />
          </>
        )}
      </Container>
    );

  if (!section) return null;
  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="lg">
        Профиль
      </Title>
      <div className={classes.layout}>
        <div className={classes.nav}>
          <ProfileNav active={section.key} />
        </div>
        <SectionView section={section} />
      </div>
    </Container>
  );
}

function SectionView({ section }: { section: ProfileSectionInfo }) {
  return (
    <section aria-labelledby="profile-section-title" className={classes.body}>
      <Title order={2} id="profile-section-title">
        {section.label}
      </Title>
      <Text c="dimmed" mb="lg">
        {section.hint}
      </Text>
      {SECTION_BODY[section.key]()}
    </section>
  );
}

export default ProfilePage;
