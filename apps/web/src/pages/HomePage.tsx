import { Anchor, Group } from '@mantine/core';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <>
      <h1>Hello world</h1>
      <Group>
        <Anchor component={Link} to="/login">
          Войти
        </Anchor>
        <Anchor component={Link} to="/register">
          Зарегистрироваться
        </Anchor>
      </Group>
    </>
  );
}

export default HomePage;
