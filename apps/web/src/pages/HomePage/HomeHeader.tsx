import { Button, Group, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreateGameModal } from '../../features/games';

interface HomeHeaderProps {
  title: string;
  subtitle: string;
}

// Приветствие и два частых действия: новый персонаж и новая игра. Игру создаёт то же
// окно, что на странице «Игры», — после создания мастер сразу в лобби.
function HomeHeader({ title, subtitle }: HomeHeaderProps) {
  const [creating, setCreating] = useState(false);
  return (
    <Group justify="space-between" align="flex-end" gap="md">
      <div>
        <Title order={1} fz={{ base: 22, sm: 30 }}>
          {title}
        </Title>
        <Text c="dimmed" mt={6}>
          {subtitle}
        </Text>
      </div>
      <Group gap="xs">
        <Button
          component={Link}
          to="/characters/new"
          variant="default"
          leftSection={<IconPlus size={16} />}
        >
          Персонаж
        </Button>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreating(true)}
        >
          Новая игра
        </Button>
      </Group>
      <CreateGameModal opened={creating} onClose={() => setCreating(false)} />
    </Group>
  );
}

export default HomeHeader;
