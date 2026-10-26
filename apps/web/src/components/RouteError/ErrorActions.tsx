import { Button, Group } from '@mantine/core';
import { page } from '../../lib/chunkReload';

// «На главную» — полная загрузка, а не переход роутера: после деплоя так подтянется
// новая версия, а после сбоя сбросится сломанное состояние.
function ErrorActions() {
  return (
    <Group gap="sm" mt="xs">
      <Button onClick={page.reload}>Обновить страницу</Button>
      <Button component="a" href="/" variant="default">
        На главную
      </Button>
    </Group>
  );
}

export default ErrorActions;
