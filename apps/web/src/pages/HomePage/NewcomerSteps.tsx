import { Button, Card, Group, SimpleGrid, Text, Title } from '@mantine/core';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CreateGameModal } from '../../features/games';
import classes from './HomePage.module.css';

interface StepProps {
  n: number;
  title: string;
  text: string;
  // Первый шаг выделен: с него стоит начать.
  current?: boolean;
  children: ReactNode;
}

function Step({ n, title, text, current, children }: StepProps) {
  return (
    <Card
      withBorder
      radius="lg"
      p="lg"
      component="section"
      aria-label={`Шаг ${n}: ${title}`}
      className={current ? classes.currentStep : undefined}
    >
      <span
        className={`${classes.stepNum} ${current ? classes.stepNumCurrent : ''}`}
        aria-hidden
      >
        {n}
      </span>
      <Title order={2} fz="lg" mt="md">
        {title}
      </Title>
      <Text size="sm" c="dimmed" mt={8} mb="md" style={{ flex: 1 }}>
        {text}
      </Text>
      <Group gap="xs">{children}</Group>
    </Card>
  );
}

// Три шага для того, у кого ещё нет ни персонажей, ни игр, ни карт.
function NewcomerSteps() {
  const [creating, setCreating] = useState(false);
  return (
    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
      <Step
        n={1}
        current
        title="Создайте персонажа"
        text="Вид, класс, характеристики и снаряжение. Можно добавить портрет и 3D-модель."
      >
        <Button component={Link} to="/characters/new">
          Создать персонажа
        </Button>
      </Step>
      <Step
        n={2}
        title="Сядьте в игру"
        text="Выберите открытую игру ниже или создайте свою и пришлите друзьям ссылку на лобби."
      >
        <Button component={Link} to="/games" variant="default">
          Все игры
        </Button>
        <Button variant="default" onClick={() => setCreating(true)}>
          Новая игра
        </Button>
      </Step>
      <Step
        n={3}
        title="Постройте карту"
        text="Для мастера: соберите подземелье из блоков и обстановки, а в игре оно станет сценой."
      >
        <Button component={Link} to="/maps" variant="default">
          Новая карта
        </Button>
      </Step>
      <CreateGameModal opened={creating} onClose={() => setCreating(false)} />
    </SimpleGrid>
  );
}

export default NewcomerSteps;
