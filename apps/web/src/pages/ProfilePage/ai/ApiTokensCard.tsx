import {
  Alert,
  Button,
  Card,
  Code,
  CopyButton,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useEffect, useState, type FormEvent } from 'react';
import type { ApiTokenInfo, CreatedApiToken } from 'shared';
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
} from '../../../features/apiTokens';
import { errorMessage } from '../../../lib/apiRequest';
import ApiTokenRow from './ApiTokenRow';

// Токены для внешних клиентов — MCP-серверов, через которые нейросеть работает с
// приложением. Что токену закрыто — docs/plan/ai-access.md.
function ApiTokensCard() {
  const [tokens, setTokens] = useState<ApiTokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedApiToken | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    listApiTokens()
      .then(setTokens)
      .catch((err: unknown) => {
        console.error('Failed to load API tokens', err);
        setError(errorMessage(err, 'Не удалось загрузить токены'));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    createApiToken(name.trim())
      .then((result) => {
        setCreated(result);
        setTokens((prev) => [result.info, ...prev]);
        setName('');
      })
      .catch((err: unknown) => {
        console.error('Failed to create API token', err);
        setError(errorMessage(err, 'Не удалось создать токен'));
      })
      .finally(() => setCreating(false));
  };

  const handleRevoke = (id: string) => {
    if (!window.confirm('Отозвать токен? Клиенты с ним перестанут работать.')) {
      return;
    }
    setRevokingId(id);
    setError(null);
    revokeApiToken(id)
      .then(() => {
        setTokens((prev) => prev.filter((t) => t.id !== id));
        if (created?.info.id === id) setCreated(null);
      })
      .catch((err: unknown) => {
        console.error('Failed to revoke API token', err);
        setError(errorMessage(err, 'Не удалось отозвать токен'));
      })
      .finally(() => setRevokingId(null));
  };

  return (
    <Card withBorder padding="lg" radius="md">
      <Text size="sm" c="dimmed" mb="md">
        Токен нужен MCP-серверу: с ним нейросеть смотрит, создаёт и правит ваших
        персонажей, монстров, предметы, способности, эффекты и карты. Удалять,
        публиковать и менять аккаунт через токен нельзя.
      </Text>

      <form onSubmit={handleCreate}>
        <Group align="flex-end" mb="md">
          <TextInput
            label="Новый токен"
            placeholder="Например: Claude Code на ноутбуке"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            maxLength={100}
            style={{ flex: 1, minWidth: 200 }}
          />
          <Button type="submit" loading={creating} disabled={!name.trim()}>
            Создать
          </Button>
        </Group>
      </form>

      {created && (
        <Alert color="green" title="Токен создан" mb="md">
          <Text size="sm" mb="xs">
            Скопируйте его сейчас — больше он показан не будет.
          </Text>
          <Group gap="xs" wrap="nowrap">
            <Code style={{ wordBreak: 'break-all' }}>{created.token}</Code>
            <CopyButton value={created.token}>
              {({ copied, copy }) => (
                <Button size="xs" variant="light" onClick={copy}>
                  {copied ? 'Скопирован' : 'Копировать'}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Alert>
      )}

      {error && (
        <Alert color="red" title="Ошибка" mb="md">
          {error}
        </Alert>
      )}

      {loading ? (
        <Loader size="sm" />
      ) : tokens.length === 0 ? (
        <Text size="sm" c="dimmed">
          Токенов пока нет.
        </Text>
      ) : (
        <Stack gap="xs">
          {tokens.map((token) => (
            <ApiTokenRow
              key={token.id}
              token={token}
              revoking={revokingId === token.id}
              onRevoke={() => handleRevoke(token.id)}
            />
          ))}
        </Stack>
      )}
    </Card>
  );
}

export default ApiTokensCard;
