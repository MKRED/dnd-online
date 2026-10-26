import { Alert, Button, Group, Stack, Text } from '@mantine/core';

interface FogOffConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
}

// Предупреждение перед выключением тумана войны (замечания после первой партии,
// 2026-10-26): здесь же, без окна, как сброс тумана в «Служебном».
function FogOffConfirm({ onConfirm, onCancel }: FogOffConfirmProps) {
  return (
    <Alert color="orange" title="Выключить туман войны?">
      <Stack gap="xs">
        <Text size="xs">
          Игроки сразу увидят всю сцену: и куда их персонажи ещё не ходили, и
          существ за стенами.
        </Text>
        <Group gap="xs">
          <Button size="xs" color="orange" onClick={onConfirm}>
            Выключить
          </Button>
          <Button size="xs" variant="default" onClick={onCancel} autoFocus>
            Оставить
          </Button>
        </Group>
      </Stack>
    </Alert>
  );
}

export default FogOffConfirm;
