import { Anchor, Card, Group, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import classes from './HomePage.module.css';

interface HomeSectionProps {
  title: string;
  // Ссылка «Все …» в шапке блока — на полный раздел.
  more: { to: string; label: string };
  children: ReactNode;
}

// Блок главной: шапка с названием и ссылкой на раздел, под ней строки во всю ширину.
function HomeSection({ title, more, children }: HomeSectionProps) {
  return (
    <Card
      withBorder
      radius="lg"
      p={0}
      component="section"
      aria-label={title}
      className={classes.section}
    >
      <Group justify="space-between" px="md" py="sm">
        <Title order={2} fz="md">
          {title}
        </Title>
        <Anchor component={Link} to={more.to} size="sm">
          {more.label}
        </Anchor>
      </Group>
      {children}
    </Card>
  );
}

export default HomeSection;
