import { Center, Loader, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useLocation, useRouteError } from 'react-router-dom';
import {
  canReloadForNewVersion,
  isChunkLoadError,
  reloadForNewVersion,
} from '../../lib/chunkReload';
import { usePageTitle } from '../../lib/usePageTitle';
import ErrorActions from './ErrorActions';
import ErrorCard from './ErrorCard';
import ErrorDetails from './ErrorDetails';

function errorText(error: unknown, pathname: string): string {
  const message = error instanceof Error ? error.message : String(error);
  return `${message}\nСтраница: ${pathname}`;
}

// Страница ошибки маршрута (errorElement) вместо стандартной английской заглушки React
// Router. Если не загрузился кусок сайта — чаще всего вкладка открыта до деплоя, — страница
// один раз перезагружается сама; если и это не помогло, просит обновить её вручную.
function RouteError() {
  const error = useRouteError();
  const { pathname } = useLocation();
  const chunk = isChunkLoadError(error);
  // Решаем один раз при показе: после перезагрузки метка в хранилище уже стоит.
  const [reloading] = useState(() => chunk && canReloadForNewVersion());
  usePageTitle(reloading ? undefined : 'Ошибка');

  useEffect(() => {
    console.error('Route error', { pathname, error });
  }, [error, pathname]);
  useEffect(() => {
    if (reloading) reloadForNewVersion();
  }, [reloading]);

  if (reloading)
    return (
      <Center mih="70vh" p="md">
        <Stack align="center" gap="sm" maw={440} ta="center">
          <Loader />
          <Text fw={600} size="lg">
            Загружаем новую версию сайта…
          </Text>
          <Text c="dimmed">
            Сайт обновился, пока страница была открыта. Страница перезагрузится
            сама за секунду.
          </Text>
        </Stack>
      </Center>
    );

  if (chunk)
    return (
      <ErrorCard
        icon={
          <IconRefresh
            size={40}
            stroke={1.5}
            color="var(--mantine-primary-color-filled)"
          />
        }
        title="Не удалось загрузить часть сайта"
        text="Похоже, пропал интернет или сайт как раз обновляется. Обновите страницу через минуту."
      >
        <ErrorActions />
      </ErrorCard>
    );

  return (
    <ErrorCard
      icon={
        <IconAlertTriangle
          size={40}
          stroke={1.5}
          color="var(--mantine-primary-color-filled)"
        />
      }
      title="Что-то пошло не так"
      text="Страница сломалась из-за ошибки в приложении. Попробуйте обновить её. Если не поможет, расскажите, что вы делали, и приложите текст ошибки."
    >
      <ErrorActions />
      <ErrorDetails text={errorText(error, pathname)} />
    </ErrorCard>
  );
}

export default RouteError;
