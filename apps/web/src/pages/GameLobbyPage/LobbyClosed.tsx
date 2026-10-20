import { Alert, Button } from '@mantine/core';
import { Link } from 'react-router-dom';

const TEXT = {
  deleted: { title: 'Игру удалили', body: 'Мастер удалил эту игру.' },
  removed: {
    title: 'Вас убрали из игры',
    body: 'Мастер убрал вас из игры. Вернуться можно только с паролем.',
  },
} as const;

// Лобби закрылось, пока было открыто: сокет сказал, что игры нет или доступа больше нет.
function LobbyClosed({ reason }: { reason: keyof typeof TEXT }) {
  const { title, body } = TEXT[reason];
  return (
    <Alert color="yellow" title={title}>
      {body}
      <Button
        component={Link}
        to="/games"
        variant="light"
        mt="sm"
        display="block"
      >
        К списку игр
      </Button>
    </Alert>
  );
}

export default LobbyClosed;
