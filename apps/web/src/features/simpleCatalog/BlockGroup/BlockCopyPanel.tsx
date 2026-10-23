import { Alert, Anchor, Button, Group, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { BlockGroup } from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import type { CardActionsProps } from '../simpleCatalogs';
import { copyBlockGroup, pullBlockGroup } from './blockCopyApi';

const PULL_CONFIRM =
  'Вид и свойства группы станут как у оригинала — ваши правки в них пропадут. Название, описание и источники останутся. Подтянуть обновления?';

// Копирование и обновление копии на карточке группы блоков (docs/plan/blocks.md,
// этап 6б): чужую опубликованную группу копируют себе, у копии — откуда она, пометка
// «Автор обновил блок» с «Подтянуть обновления» или «Оригинал недоступен».
function BlockCopyPanel({ entry, isAuthor, onChange }: CardActionsProps) {
  const group = entry as BlockGroup;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulled, setPulled] = useState(false);
  const { origin } = group;

  const copy = () => {
    setBusy(true);
    setError(null);
    copyBlockGroup(group.id)
      .then((created) => navigate(`/blocks/${created.id}`))
      .catch((err: unknown) => {
        console.error('Failed to copy block group', err);
        setError(errorMessage(err, 'Не удалось скопировать группу блоков'));
        setBusy(false);
      });
  };

  const pull = () => {
    if (!window.confirm(PULL_CONFIRM)) return;
    setBusy(true);
    setError(null);
    pullBlockGroup(group.id)
      .then((updated) => {
        onChange(updated);
        setPulled(true);
      })
      .catch((err: unknown) => {
        console.error('Failed to pull block group updates', err);
        setError(errorMessage(err, 'Не удалось подтянуть обновления'));
      })
      .finally(() => setBusy(false));
  };

  return (
    <Stack gap="xs">
      {origin && (
        <Text size="sm" c="dimmed">
          Копия блока{' '}
          {origin.available ? (
            <Anchor component={Link} to={`/blocks/${origin.id}`} size="sm">
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
        <Alert color="blue" p="sm" title="Автор обновил блок">
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
      {!isAuthor && group.isPublic && (
        <Group gap="sm">
          <Button variant="light" loading={busy} onClick={copy}>
            Скопировать себе
          </Button>
          <Text size="xs" c="dimmed" maw={360}>
            Своя копия — её можно править и ставить на свои карты, а обновления
            автора подтягивать.
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

export default BlockCopyPanel;
