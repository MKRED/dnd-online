import { Alert, Anchor, Button, Group, Stack, Text } from '@mantine/core';
import { useState, type ComponentType } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CatalogOrigin } from 'shared';
import { errorMessage } from '../../lib/apiRequest';
import type { CardActionsProps, SimpleEntry } from './simpleCatalogs';

// Чем копирование одного раздела отличается от другого: адрес, запросы и тексты
// («Копия блока «…» от …», «Автор обновил блок»).
export interface CopyPanelConfig {
  path: string;
  copy: (id: string) => Promise<SimpleEntry>;
  pull: (id: string) => Promise<SimpleEntry>;
  texts: {
    copyOf: string;
    updated: string;
    pullConfirm: string;
    copyFailed: string;
    copyHint: string;
  };
}

// Копирование и обновление копии на карточке (docs/plan/blocks.md, этапы 6б и 8а):
// чужую опубликованную запись копируют себе, у копии — откуда она, пометка «Автор
// обновил…» с «Подтянуть обновления» или «Оригинал недоступен».
export function copyPanel(
  config: CopyPanelConfig,
): ComponentType<CardActionsProps> {
  const { path, texts } = config;
  function CopyPanel({ entry, isAuthor, onChange }: CardActionsProps) {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pulled, setPulled] = useState(false);
    const origin = (entry as { origin?: CatalogOrigin | null }).origin ?? null;

    const copy = () => {
      setBusy(true);
      setError(null);
      config
        .copy(entry.id)
        .then((created) => navigate(`${path}/${created.id}`))
        .catch((err: unknown) => {
          console.error('Failed to copy catalog entry', err);
          setError(errorMessage(err, texts.copyFailed));
          setBusy(false);
        });
    };

    const pull = () => {
      if (!window.confirm(texts.pullConfirm)) return;
      setBusy(true);
      setError(null);
      config
        .pull(entry.id)
        .then((updated) => {
          onChange(updated);
          setPulled(true);
        })
        .catch((err: unknown) => {
          console.error('Failed to pull catalog entry updates', err);
          setError(errorMessage(err, 'Не удалось подтянуть обновления'));
        })
        .finally(() => setBusy(false));
    };

    return (
      <Stack gap="xs">
        {origin && (
          <Text size="sm" c="dimmed">
            {texts.copyOf}{' '}
            {origin.available ? (
              <Anchor component={Link} to={`${path}/${origin.id}`} size="sm">
                «{origin.name}»
              </Anchor>
            ) : (
              `«${origin.name}»`
            )}{' '}
            от {origin.authorNickname}
            {!origin.available &&
              ' — оригинал недоступен: автор скрыл или удалил его'}
          </Text>
        )}
        {isAuthor && origin?.updated && (
          <Alert color="blue" p="sm" title={texts.updated}>
            <Group justify="space-between" gap="sm">
              <Text size="sm">Вид или свойства оригинала изменились.</Text>
              <Button size="xs" loading={busy} onClick={pull}>
                Подтянуть обновления
              </Button>
            </Group>
          </Alert>
        )}
        {isAuthor && pulled && !origin?.updated && (
          <Text size="sm" c="teal">
            Обновлено: вид и свойства — как у оригинала.
          </Text>
        )}
        {!isAuthor && entry.isPublic && (
          <Group gap="sm">
            <Button variant="light" loading={busy} onClick={copy}>
              Скопировать себе
            </Button>
            <Text size="xs" c="dimmed" maw={360}>
              {texts.copyHint}
            </Text>
          </Group>
        )}
        {error && (
          <Alert color="red" p="xs">
            {error}
          </Alert>
        )}
      </Stack>
    );
  }
  return CopyPanel;
}
