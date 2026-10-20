import { Accordion, Code, Stack, Text } from '@mantine/core';
import type { GameEvent } from 'shared';
import { gameEventText, gameEventTime } from '../../../features/games';

// Запись журнала: фраза, время и кто; по раскрытию — номер, вид и данные события как есть,
// для разбора, что и почему произошло.
function GameEventItem({ event }: { event: GameEvent }) {
  const who = event.actor?.nickname ?? 'удалённый пользователь';
  const asMaster = event.as?.kind === 'master' ? ' · мастер' : '';
  return (
    <Accordion.Item value={String(event.seq)}>
      <Accordion.Control>
        <Text size="sm">{gameEventText(event)}</Text>
        <Text size="xs" c="dimmed">
          {gameEventTime(event.createdAt)} · {who}
          {asMaster}
        </Text>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="xs">
          <Text size="xs" c="dimmed">
            № {event.seq} · {event.kind}
          </Text>
          <EventData label="Намерение" value={event.intent} />
          <EventData label="Итог" value={event.result} />
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function EventData({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <Text size="xs" fw={600}>
        {label}
      </Text>
      {value === null ? (
        <Text size="xs" c="dimmed">
          —
        </Text>
      ) : (
        // Перенос внутри блока: длинные id не растягивают узкую шторку.
        <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {JSON.stringify(value, null, 2)}
        </Code>
      )}
    </div>
  );
}

export default GameEventItem;
