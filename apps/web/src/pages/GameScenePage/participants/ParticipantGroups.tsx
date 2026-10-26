import { Text, UnstyledButton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import ParticipantRow, { type Participant } from './ParticipantRow';
import Portrait from './Portrait';
import {
  isDown,
  revealKeys,
  selectionKey,
  type ParticipantGroup,
} from './participantGroups';
import classes from './participants.module.css';
import { useOpenGroups } from './useOpenGroups';

interface ParticipantGroupsProps {
  groups: readonly ParticipantGroup[];
  selectedKey: string | null;
  // Щелчок по строке; двойной щелчок ловит вкладка (useDoubleOpen).
  onSelect: (participant: Participant) => void;
}

// «3 · ранено 1 · повержено 2» — сколько всего и кто в беде, видно и в свёрнутом.
function tally(count: number, hurt: number, down: number) {
  return [
    String(count),
    hurt > 0 && `ранено ${hurt}`,
    down > 0 && `повержено ${down}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

function Toggle({
  open,
  onClick,
  className,
  children,
}: {
  open: boolean;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <UnstyledButton
      className={className}
      aria-expanded={open}
      onClick={onClick}
    >
      <IconChevronRight
        size={14}
        className={classes.chevron}
        data-open={open || undefined}
        aria-hidden
      />
      {children}
    </UnstyledButton>
  );
}

// Группы «Участников» (замечания после первой партии, 2026-10-26): каждая сворачивается,
// одинаковые существа — одной раскрывающейся строкой. Выбранный на сцене раскрывает свою
// группу и свою строку одинаковых, чтобы его было видно и в списке.
function ParticipantGroups({
  groups,
  selectedKey,
  onSelect,
}: ParticipantGroupsProps) {
  const open = useOpenGroups();
  // Раскрываем один раз на новый выбор, а не на каждую отрисовку: иначе мастер не смог бы
  // свернуть группу с выбранным. Пока строки выбранного нет (список ещё грузится), ждём.
  const [revealed, setRevealed] = useState<string | null>(null);
  if (selectedKey !== revealed) {
    const keys = selectedKey ? revealKeys(groups, selectedKey) : [];
    if (!selectedKey || keys.length > 0) {
      setRevealed(selectedKey);
      open.reveal(keys);
    }
  }

  const row = (participant: Participant, nested = false) => (
    <div key={participant.key} className={nested ? classes.nested : undefined}>
      <ParticipantRow
        participant={participant}
        selected={selectedKey === selectionKey(participant)}
        onSelect={() => onSelect(participant)}
      />
    </div>
  );

  return (
    <>
      {groups.map((group) => {
        const groupOpen = open.isOpen(group.key);
        return (
          <div key={group.key} className={classes.group}>
            <Toggle
              open={groupOpen}
              onClick={() => open.toggle(group.key)}
              className={classes.groupHead}
            >
              <span className={classes.section}>{group.title}</span>
              <Text size="xs" c="dimmed" className={classes.tally}>
                {tally(group.count, group.hurt, group.down)}
              </Text>
            </Toggle>
            {groupOpen &&
              group.entries.map((entry) => {
                if (entry.kind === 'row') return row(entry.participant);
                const [first] = entry.participants;
                const kinOpen = open.isOpen(entry.key);
                const hurt = entry.participants.filter(
                  (p) => p.health === 'bloodied',
                ).length;
                const down = entry.participants.filter(isDown).length;
                return (
                  <div key={entry.key}>
                    <Toggle
                      open={kinOpen}
                      onClick={() => open.toggle(entry.key)}
                      className={classes.kinHead}
                    >
                      <Portrait
                        image={first.image}
                        name={first.name}
                        kind={first.kind}
                      />
                      <Text size="sm" fw={600} truncate component="span">
                        {first.name}
                      </Text>
                      <Text size="xs" c="dimmed" className={classes.tally}>
                        ×{tally(entry.participants.length, hurt, down)}
                      </Text>
                    </Toggle>
                    {kinOpen && entry.participants.map((p) => row(p, true))}
                  </div>
                );
              })}
          </div>
        );
      })}
    </>
  );
}

export default ParticipantGroups;
