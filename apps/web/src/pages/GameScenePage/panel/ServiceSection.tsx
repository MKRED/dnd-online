import {
  Alert,
  Button,
  Group,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useState } from 'react';
import type { SceneFogControls } from '../fog';

// Раздел «Служебное» во вкладке «Сцена»: кнопки для проверок, которые в игре не нужны,
// поэтому свёрнут. Пока в нём сброс тумана войны — подтверждение здесь же, без окна:
// сброс не отменить.
function ServiceSection({ fog }: { fog: SceneFogControls }) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const busy = fog.resetState === 'busy';

  const confirm = () => {
    setAsking(false);
    fog.reset();
  };

  return (
    <Stack gap="xs">
      <UnstyledButton
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ alignSelf: 'flex-start' }}
      >
        <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.06em">
          {open ? '▾' : '▸'} Служебное
        </Text>
      </UnstyledButton>
      {open && (
        <Stack gap="xs">
          <Text size="xs" c="dimmed">
            {fog.fogOn
              ? 'Для проверок: игроки открывают сцену заново.'
              : 'Сброс тумана доступен, когда туман войны включён.'}
          </Text>
          {asking ? (
            <Alert color="red" title="Сбросить туман войны?">
              <Stack gap="xs">
                <Text size="xs">
                  Игроки забудут, что открыли на этой сцене, и увидят только то,
                  что их персонажи видят сейчас. Карта и фигурки не меняются.
                  Отменить нельзя.
                </Text>
                <Group gap="xs">
                  <Button size="xs" color="red" onClick={confirm} autoFocus>
                    Сбросить
                  </Button>
                  <Button
                    size="xs"
                    variant="default"
                    onClick={() => setAsking(false)}
                  >
                    Отмена
                  </Button>
                </Group>
              </Stack>
            </Alert>
          ) : (
            <Button
              size="xs"
              variant="outline"
              color="red"
              style={{ alignSelf: 'flex-start' }}
              disabled={!fog.fogOn}
              loading={busy}
              onClick={() => setAsking(true)}
            >
              Сбросить туман войны
            </Button>
          )}
          {fog.resetState === 'done' && !asking && (
            <Text size="xs" c="green">
              Туман сброшен — игроки видят только то, что видно сейчас.
            </Text>
          )}
          {fog.resetError && <Alert color="red">{fog.resetError}</Alert>}
        </Stack>
      )}
    </Stack>
  );
}

export default ServiceSection;
