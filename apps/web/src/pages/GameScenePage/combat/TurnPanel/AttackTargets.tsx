import { Alert, Badge, Button, Group, Loader, Text } from '@mantine/core';
import { IconSword } from '@tabler/icons-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { AttackKey, AttackTarget, CombatantRef } from 'shared';
import { errorMessage } from '../../../../lib/apiRequest';
import { useAttackTargeting } from '../AttackTargetingContext';
import { reasonsText } from '../RollWindow/rollWindowText';
import type { SceneCombat } from '../useSceneCombat';
import {
  refKey,
  spendText,
  targetKey,
  targetMark,
  targetMeta,
} from './attackTargetText';
import type { TurnTile } from './turnTiles';
import classes from './TurnPanel.module.css';

interface AttackTargetsProps {
  combatantId: string;
  attacker: CombatantRef;
  tile: TurnTile;
  attack: AttackKey;
  ranged: boolean;
  combat: SceneCombat;
  // Сцена изменилась (ход, фигурки): цели перечитываются.
  refresh: string;
  onConfirm: (target: AttackTarget) => void;
  onCancel: () => void;
}

// Выбор цели атаки (макет «Выбор цели атаки», ответы Михаила 2026-10-28: 1А, 2Б, 3А):
// цель ищут на сцене — подсвечена только та, что под курсором, со строкой «можно или
// нельзя», у дальней атаки к курсору тянется луч. Щелчок по цели закрепляет её, а здесь,
// в панели, — её карточка с причинами и «Подтвердить атаку». Выбор ничего не тратит.
function AttackTargets({
  combatantId,
  attacker,
  tile,
  attack,
  ranged,
  combat,
  refresh,
  onConfirm,
  onCancel,
}: AttackTargetsProps) {
  const [targets, setTargets] = useState<AttackTarget[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const { targets: load } = combat;

  useEffect(() => {
    let alive = true;
    load(combatantId, attack)
      .then((list) => {
        if (!alive) return;
        setTargets(list);
        setError(null);
      })
      .catch((err: unknown) => {
        console.error('Failed to load attack targets', err);
        if (alive) setError(errorMessage(err, 'Не удалось найти цели'));
      });
    return () => {
      alive = false;
    };
  }, [load, combatantId, attack, refresh]);

  const chosen = targets?.find((t) => targetKey(t) === selected) ?? null;

  const publish = useAttackTargeting();
  const attackerKey = refKey(attacker);
  const marks = useMemo(
    () => new Map((targets ?? []).map((t) => [targetKey(t), targetMark(t)])),
    [targets],
  );
  useEffect(() => {
    if (!targets) return;
    publish({
      marks,
      selectedKey: chosen ? selected : null,
      // Закрепить можно и цель вне досягаемости: на телефоне наведения нет, и только так
      // увидеть, почему её не достать. Подтвердить её карточка не даст.
      pick: (key) => {
        if (targets.some((t) => targetKey(t) === key)) setSelected(key);
      },
      attackerKey,
      ranged,
    });
  }, [targets, marks, chosen, selected, attackerKey, ranged, publish]);
  useEffect(() => () => publish(null), [publish]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selected) {
      e.stopPropagation();
      setSelected(null);
    }
  };
  const reachable = targets?.some((t) => t.band !== 'out') ?? false;

  return (
    <div className={classes.confirm} onKeyDown={onKeyDown}>
      <Text size="sm">{tile.tip}</Text>
      {error && (
        <Alert color="red" p="xs">
          {error}
        </Alert>
      )}
      {!targets && !error && <Loader size="xs" />}
      {targets && !chosen && (
        <Text size="sm" c="dimmed" className={classes.targetHint}>
          {targets.length === 0
            ? 'Целей не видно'
            : reachable
              ? 'Наведите на цель на карте и нажмите на неё'
              : 'Ни одна цель не в досягаемости'}
        </Text>
      )}
      {chosen && (
        <TargetConfirm
          target={chosen}
          cost={spendText(tile.cost)}
          busy={combat.busy}
          onConfirm={() => onConfirm(chosen)}
          onCancel={() => setSelected(null)}
        />
      )}
      {!chosen && (
        <Group justify="flex-end">
          <Button size="xs" variant="subtle" color="gray" onClick={onCancel}>
            Отмена
          </Button>
        </Group>
      )}
    </div>
  );
}

interface TargetConfirmProps {
  target: AttackTarget;
  cost: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Карточка выбранной цели: расстояние, укрытие (и КД — мастеру), причины броска.
function TargetConfirm({
  target,
  cost,
  busy,
  onConfirm,
  onCancel,
}: TargetConfirmProps) {
  const out = target.band === 'out';
  const why = out ? null : reasonsText(target.roll.reasons);
  // Цель выбрали на сцене, а карточка — внизу длинного блока: показать её.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [target.ref]);
  return (
    <div
      ref={ref}
      className={classes.targetConfirm}
      role="group"
      aria-label={`Цель: ${target.name}`}
    >
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <span className={classes.targetName}>
          {target.name}
          {target.ally && (
            <Badge size="xs" color="orange" variant="light">
              свой
            </Badge>
          )}
        </span>
        <span className={classes.targetMeta}>{targetMeta(target)}</span>
      </Group>
      {why && <Text size="xs">{why}</Text>}
      {target.ally && (
        <Text size="xs" c="orange">
          Это союзник — атака всё равно пройдёт
        </Text>
      )}
      {out && (
        <Text size="xs" c="red">
          Не достать: цель вне досягаемости
        </Text>
      )}
      <Group gap="xs" wrap="nowrap">
        <Button
          size="xs"
          color="red"
          leftSection={<IconSword size={14} />}
          loading={busy}
          disabled={out}
          onClick={onConfirm}
        >
          Подтвердить атаку
        </Button>
        <Button size="xs" variant="subtle" color="gray" onClick={onCancel}>
          Отменить
        </Button>
        <Text size="xs" c="dimmed" ml="auto">
          {cost}
        </Text>
      </Group>
    </div>
  );
}

export default AttackTargets;
