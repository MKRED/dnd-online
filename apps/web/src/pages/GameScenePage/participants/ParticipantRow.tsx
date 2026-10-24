import { Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconEyeOff } from '@tabler/icons-react';
import { creatureHealthLabel, type CreatureHealth } from 'shared';
import Portrait from './Portrait';
import classes from './participants.module.css';

// Вид участника — цветом кружка, как рамка карточки на сцене (CreatureCard).
export type ParticipantKind = 'pc' | 'npc' | 'monster';

export interface Participant {
  key: string;
  // Миниатюра; null — буква.
  image: string | null;
  kind: ParticipantKind;
  name: string;
  // Числа хитов — тем, кто их видит; null — только метка здоровья.
  hitPoints: { current: number; max: number } | null;
  health: CreatureHealth | null;
  // Сколько футов осталось на этот раунд; null — не показывать (повержен, чужой).
  feetLeft: number | null;
  hidden: boolean;
  selectable: boolean;
}

// Цвет полосы: больше половины — зелёный, до половины («Ранен», docs/dnd/hit-points.md) —
// жёлтый, на нуле — красный.
function barColor(current: number, max: number): string {
  if (current <= 0) return 'var(--mantine-color-red-filled)';
  return current * 2 > max
    ? 'var(--mantine-color-teal-filled)'
    : 'var(--mantine-color-yellow-filled)';
}

interface ParticipantRowProps {
  participant: Participant;
  selected: boolean;
  onSelect: () => void;
  // Двойной щелчок — окно карточки; нет — карточку смотрящему не открыть.
  onOpen?: () => void;
}

// Строка участника во вкладке «Участники» (docs/plan/scene-page.md, этап 2): портрет, имя, хиты полосой с числом и запас движения.
function ParticipantRow({
  participant,
  selected,
  onSelect,
  onOpen,
}: ParticipantRowProps) {
  const { name, hitPoints, health, feetLeft, hidden, kind } = participant;
  const label = health ? creatureHealthLabel(health, kind === 'pc') : null;
  const share = hitPoints
    ? Math.max(0, Math.min(1, hitPoints.current / Math.max(1, hitPoints.max)))
    : null;
  return (
    <UnstyledButton
      className={classes.row}
      data-selected={selected || undefined}
      disabled={!participant.selectable}
      aria-pressed={participant.selectable ? selected : undefined}
      aria-label={name}
      onClick={onSelect}
      onDoubleClick={onOpen}
    >
      <Portrait image={participant.image} name={name} kind={kind} />
      <span className={classes.main}>
        <span className={classes.line}>
          <Text size="sm" fw={600} truncate component="span">
            {name}
          </Text>
          {hidden && (
            <Tooltip label="Скрыт от игроков" withArrow>
              <IconEyeOff
                size={14}
                className={classes.hiddenIcon}
                aria-label="Скрыт от игроков"
              />
            </Tooltip>
          )}
          <Text
            size="xs"
            component="span"
            className={classes.hp}
            c={health ? 'red' : 'dimmed'}
          >
            {hitPoints && `${hitPoints.current}/${hitPoints.max}`}
            {hitPoints && label && ' · '}
            {label}
          </Text>
        </span>
        {share !== null && hitPoints && (
          <span className={classes.bar}>
            <span
              style={{
                width: `${share * 100}%`,
                background: barColor(hitPoints.current, hitPoints.max),
              }}
            />
          </span>
        )}
      </span>
      {feetLeft !== null && (
        <Text
          size="xs"
          component="span"
          className={classes.feet}
          c={selected ? undefined : 'dimmed'}
          fw={selected ? 600 : undefined}
        >
          {feetLeft} фт
        </Text>
      )}
    </UnstyledButton>
  );
}

export default ParticipantRow;
