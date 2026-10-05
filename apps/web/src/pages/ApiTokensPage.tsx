import {
  Alert,
  Button,
  Card,
  Code,
  Container,
  CopyButton,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useEffect, useState, type FormEvent } from 'react';
import type { ApiTokenInfo, CreatedApiToken } from 'shared';
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
} from '../features/apiTokens';
import { errorMessage } from '../lib/apiRequest';
import { usePageTitle } from '../lib/usePageTitle';

const formatDate = (iso: string) => new Date(iso).toLocaleString('ru-RU');

// Токены для внешних клиентов — MCP-сервера карты, через который нейросеть
// читает и строит карты. Токен даёт доступ только к картам.
function ApiTokensPage() {
  usePageTitle('Токены');
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
    <Container size="md" py="xl">
      <Title order={1} mb="xs">
        Токены для нейросети
      </Title>
      <Text c="dimmed" mb="lg">
        Токен нужен MCP-серверу карты: с ним нейросеть может смотреть и строить
        ваши карты. Доступа к персонажам и аккаунту у токена нет.
      </Text>

      <form onSubmit={handleCreate}>
        <Group align="flex-end" mb="lg">
          <TextInput
            label="Новый токен"
            placeholder="Например: Claude Code на ноутбуке"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            maxLength={100}
            style={{ flex: 1 }}
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
        <Loader />
      ) : tokens.length === 0 ? (
        <Text c="dimmed">Токенов пока нет.</Text>
      ) : (
        <Stack>
          {tokens.map((token) => (
            <Card key={token.id} withBorder radius="md" p="md">
              <Group justify="space-between">
                <div>
                  <Text fw={600}>{token.name}</Text>
                  <Text size="sm" c="dimmed">
                    <Code>{token.prefix}…</Code> · создан{' '}
                    {formatDate(token.createdAt)} ·{' '}
                    {token.lastUsedAt
                      ? `использован ${formatDate(token.lastUsedAt)}`
                      : 'ещё не использовался'}
                  </Text>
                </div>
                <Button
                  color="red"
                  variant="subtle"
                  size="xs"
                  loading={revokingId === token.id}
                  onClick={() => handleRevoke(token.id)}
                >
                  Отозвать
                </Button>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}

export default ApiTokensPage;
