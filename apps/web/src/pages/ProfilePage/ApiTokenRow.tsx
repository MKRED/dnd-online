import { Button, Code, Group, Paper, Text } from '@mantine/core';
import type { ApiTokenInfo } from 'shared';

const formatDate = (iso: string) => new Date(iso).toLocaleString('ru-RU');

interface Props {
  token: ApiTokenInfo;
  revoking: boolean;
  onRevoke: () => void;
}

// Строка токена в профиле: название, префикс, когда создан и когда использовался.
function ApiTokenRow({ token, revoking, onRevoke }: Props) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" wrap="nowrap">
        <div style={{ minWidth: 0 }}>
          <Text fw={600}>{token.name}</Text>
          <Text size="sm" c="dimmed">
            <Code>{token.prefix}…</Code> · создан {formatDate(token.createdAt)}{' '}
            ·{' '}
            {token.lastUsedAt
              ? `использован ${formatDate(token.lastUsedAt)}`
              : 'ещё не использовался'}
          </Text>
        </div>
        <Button
          color="red"
          variant="subtle"
          size="xs"
          loading={revoking}
          onClick={onRevoke}
        >
          Отозвать
        </Button>
      </Group>
    </Paper>
  );
}

export default ApiTokenRow;
