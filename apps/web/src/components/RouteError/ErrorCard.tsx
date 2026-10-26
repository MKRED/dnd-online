import { Center, Paper, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

interface ErrorCardProps {
  icon: ReactNode;
  title: string;
  text: string;
  children?: ReactNode;
}

// Карточка экрана ошибки: значок, заголовок, пояснение и кнопки. Стоит по центру области
// страницы — внутри каркаса с шапкой или на пустом экране, если сломался сам каркас.
function ErrorCard({ icon, title, text, children }: ErrorCardProps) {
  return (
    <Center mih="70vh" p="md">
      <Paper withBorder radius="md" p="xl" w="100%" maw={520}>
        <Stack gap="sm">
          {icon}
          <Title order={2} size="h3">
            {title}
          </Title>
          <Text c="dimmed">{text}</Text>
          {children}
        </Stack>
      </Paper>
    </Center>
  );
}

export default ErrorCard;
