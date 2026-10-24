import { Stack, Text } from '@mantine/core';
import type { CardTarget } from '../cardWindows';
import ParticipantRow, { type Participant } from './ParticipantRow';

interface PartyTabProps {
  // Герои других игроков на сцене.
  party: readonly Participant[];
  onOpenCard: (target: CardTarget) => void;
}

// Вкладка «Отряд» у игрока (docs/plan/scene-page.md, этап 5): другие герои с хитами, щелчок —
// их карточка только для чтения. НПС и врагов здесь нет: игрок видит полностью только себя
// и отряд (решено с пользователем 2026-10-24).
function PartyTab({ party, onOpenCard }: PartyTabProps) {
  if (party.length === 0) {
    return (
      <Text size="sm" c="dimmed" p="xs">
        Других героев на сцене нет.
      </Text>
    );
  }
  return (
    <Stack gap={2}>
      {party.map((hero) => (
        <ParticipantRow
          key={hero.key}
          participant={{ ...hero, selectable: true }}
          selected={false}
          onSelect={() => onOpenCard({ kind: 'character', id: hero.key })}
        />
      ))}
      <Text size="xs" c="dimmed" px="xs" pt={4}>
        Щелчок по герою — его карточка.
      </Text>
    </Stack>
  );
}

export default PartyTab;
