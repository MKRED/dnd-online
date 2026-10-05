import { Button, Container, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle';

function NotFoundPage() {
  usePageTitle('Страница не найдена');
  return (
    <Container size="sm" py="xl" ta="center">
      <Title order={1}>404</Title>
      <Text c="dimmed" mt="sm" mb="lg">
        Такой страницы не существует.
      </Text>
      <Button component={Link} to="/">
        На главную
      </Button>
    </Container>
  );
}

export default NotFoundPage;
