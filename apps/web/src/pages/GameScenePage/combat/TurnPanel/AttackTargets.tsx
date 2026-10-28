import { Alert, Badge, Button, Group, Loader, Text } from '@mantine/core';
import { IconSword } from '@tabler/icons-react';
import { useEffect, useState, type KeyboardEvent } from 'react';
import type { AttackKey, AttackTarget } from 'shared';
import { errorMessage } from '../../../../lib/apiRequest';
import { useAttackTargeting } from '../AttackTargetingContext';
import { reasonsText } from '../RollWindow/rollWindowText';
import type { SceneCombat } from '../useSceneCombat';
import { spendText, targetKey, targetMeta } from './attackTargetText';
import type { TurnTile } from './turnTiles';
import classes from './TurnPanel.module.css';

interface AttackTargetsProps {
  combatantId: string;
  tile: TurnTile;
  attack: AttackKey;
  combat: SceneCombat;
  // Сцена изменилась (ход, фигурки): список перечитывается.
  refresh: string;
  onConfirm: (target: AttackTarget) => void;
  onCancel: () => void;
}

// Список целей под значком атаки (макет «Атака и начало боя», вариант Б): ближние сверху,
// вне досягаемости — бледные. Выбор ничего не тратит: у выбранной цели — причины
// преимущества и помехи, «Подтвердить атаку» и «Отменить» (Esc).
function AttackTargets({
  combatantId,
  tile,
  attack,
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

  // Те же цели — красным на сцене; щелчок по существу там выбирает его здесь.
  const publish = useAttackTargeting();
  const chosenId = chosen?.ref.kind === 'creature' ? chosen.ref.objectId : null;
  useEffect(() => {
    if (!targets) return;
    const ids = new Set(
      targets.flatMap((t) =>
        t.ref.kind === 'creature' && t.band !== 'out' ? [t.ref.objectId] : [],
      ),
    );
    publish({
      ids,
      selectedId: chosenId,
      pick: (id) => {
        if (ids.has(id)) setSelected(`creature:${id}`);
      },
    });
    return () => publish(null);
  }, [targets, chosenId, publish]);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selected) {
      e.stopPropagation();
      setSelected(null);
    }
  };

  return (
    <div className={classes.confirm} onKeyDown={onKeyDown}>
      <Text size="sm">{tile.tip}</Text>
      {error && (
        <Alert color="red" p="xs">
          {error}
        </Alert>
      )}
      {!targets && !error && <Loader size="xs" />}
      {targets?.length === 0 && (
        <Text size="sm" c="dimmed">
          Целей не видно
        </Text>
      )}
      {targets && targets.length > 0 && (
        <div className={classes.targets} role="list" aria-label="Цели">
          {targets.map((target) => {
            const key = targetKey(target);
            const out = target.band === 'out';
            const open = chosen !== null && key === selected;
            return (
              <div key={key} role="listitem" className={classes.targetItem}>
                <button
                  type="button"
                  className={classes.target}
                  aria-pressed={open}
                  disabled={out}
                  data-out={out || undefined}
                  onClick={() => setSelected(open ? null : key)}
                >
                  <span className={classes.targetName}>
                    {target.name}
                    {target.ally && (
                      <Badge size="xs" color="orange" variant="light">
                        свой
                      </Badge>
                    )}
                  </span>
                  <span className={classes.targetMeta}>
                    {targetMeta(target)}
                  </span>
                </button>
                {open && (
                  <TargetConfirm
                    target={target}
                    cost={spendText(tile.cost)}
                    busy={combat.busy}
                    onConfirm={() => onConfirm(target)}
                    onCancel={() => setSelected(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
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

function TargetConfirm({
  target,
  cost,
  busy,
  onConfirm,
  onCancel,
}: TargetConfirmProps) {
  const why = reasonsText(target.roll.reasons);
  return (
    <div className={classes.targetConfirm}>
      {why && <Text size="xs">{why}</Text>}
      {target.ally && (
        <Text size="xs" c="orange">
          Это союзник — атака всё равно пройдёт
        </Text>
      )}
      <Group gap="xs" wrap="nowrap">
        <Button
          size="xs"
          color="red"
          leftSection={<IconSword size={14} />}
          loading={busy}
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
