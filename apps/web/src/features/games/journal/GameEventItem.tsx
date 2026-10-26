import { Accordion, Code, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconEyeOff } from '@tabler/icons-react';
import type { GameEvent } from 'shared';
import classes from './Journal.module.css';
import { eventLook } from './eventLook';
import GameEventLine from './GameEventLine';
import { gameEventTime } from './gameEventText';
import type { JournalView } from './journalView';

// Запись журнала: значок группы, строка, время и кто; запись, которой игроки не видят, у
// мастера помечена. По раскрытию — номер, вид и данные события как есть, для разбора,
// что и почему произошло.
function GameEventItem({
  event,
  view = 'master',
}: {
  event: GameEvent;
  view?: JournalView;
}) {
  const who = event.actor?.nickname ?? 'удалённый пользователь';
  const asMaster = event.as?.kind === 'master' ? ' · мастер' : '';
  const { icon: Icon, color } = eventLook(event);
  const masterOnly = view === 'master' && event.visibility === 'master';
  return (
    <Accordion.Item value={String(event.seq)}>
      <Accordion.Control>
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <ThemeIcon variant="light" color={color} radius="xl" size={26}>
            <Icon size={15} />
          </ThemeIcon>
          <Stack gap={2} miw={0}>
            <Text size="sm" c={masterOnly ? 'dimmed' : undefined}>
              <GameEventLine event={event} view={view} />
            </Text>
            <Text size="xs" c="dimmed">
              {gameEventTime(event.createdAt)} · {who}
              {asMaster}
              {masterOnly && (
                <span className={classes.masterOnly}>
                  {' · '}
                  <IconEyeOff size={12} style={{ verticalAlign: -2 }} /> только
                  мастеру
                </span>
              )}
            </Text>
          </Stack>
        </Group>
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
