import { Alert, Button, Modal, SegmentedControl, Text } from '@mantine/core';
import { IconDice5 } from '@tabler/icons-react';
import { useState } from 'react';
import {
  rollModeOf,
  type AttackKey,
  type AttackTarget,
  type GameCombatAttack,
  type GameCombatDamage,
  type PendingDamage,
  type RollMode,
} from 'shared';
import { MASTER_MODES, RollDisplay, useDiceRoll } from '../RollWindow';
import rollClasses from '../RollWindow/RollWindow.module.css';
import DamageStep from './DamageStep';
import { coverText, outcomeText } from './attackWindowText';
import classes from './AttackWindow.module.css';

// Окно открывают «Подтвердить атаку» у цели или «Бросить урон» у попадания без урона.
export type AttackWindowStart =
  | { kind: 'attack'; attack: AttackKey; name: string; target: AttackTarget }
  | { kind: 'damage'; pending: PendingDamage };

interface AttackWindowProps {
  combatantId: string;
  attackerName: string;
  start: AttackWindowStart;
  master: boolean;
  onAttack: (mode: RollMode | null) => Promise<GameCombatAttack>;
  onDamage: () => Promise<GameCombatDamage>;
  onClose: () => void;
}

// Атака в окне броска (docs/plan/combat.md, «Решения к этапу 5», макет «Атака и начало
// боя», вариант Б): «Бросить кубик» — к20 со слагаемыми и причинами, «Попадание» или
// «Промах» (мастеру — против какого КД); при попадании «Бросить урон» — кости и итог.
function AttackWindow({
  combatantId,
  attackerName,
  start,
  master,
  onAttack,
  onDamage,
  onClose,
}: AttackWindowProps) {
  const [choice, setChoice] = useState('rules');
  const { phase, roll } = useDiceRoll(onAttack);
  const rolling = phase.kind === 'rolling';
  const done = phase.kind === 'done' ? phase.roll : null;
  const target = start.kind === 'attack' ? start.target : null;
  const rules = target ? rollModeOf(target.roll.reasons, null) : 'normal';
  const mode: RollMode = choice === 'rules' ? rules : (choice as RollMode);
  // Попадание ждёт урона: что бросать — из очереди после броска или из прошлого попадания.
  const hit =
    start.kind === 'damage'
      ? start.pending
      : done && done.outcome !== 'miss'
        ? (done.combat.combatants.find((c) => c.id === combatantId)?.attack
            ?.pending ?? null)
        : null;
  const name = start.kind === 'attack' ? start.name : start.pending.name;
  const targetName = target?.name ?? hit?.target.name ?? '';
  const cover = target ? coverText(target.cover) : null;

  return (
    <Modal
      opened
      onClose={onClose}
      centered
      size={380}
      // Пока кость в полёте, окно не закрыть: бросок уже ушёл на сервер.
      closeOnClickOutside={!rolling}
      closeOnEscape={!rolling}
      withCloseButton={!rolling}
      title={
        <span className={rollClasses.title}>
          {name}
          <span className={rollClasses.caption}> · {attackerName}</span>
        </span>
      }
    >
      <div className={rollClasses.body}>
        <Text fw={700} size="lg" ta="center">
          <span className={classes.arrow}>→ </span>
          {targetName}
        </Text>
        {target && (
          <>
            <RollDisplay
              pending={target.roll}
              rolling={phase.kind === 'rolling' ? phase.face : null}
              done={done?.roll ?? null}
              mode={mode}
            />
            {cover && (
              <Text size="xs" c="dimmed" ta="center">
                {cover}
              </Text>
            )}
            {master && !done && (
              <SegmentedControl
                size="xs"
                fullWidth
                data={MASTER_MODES}
                value={choice}
                onChange={setChoice}
                disabled={rolling}
                aria-label="Как бросать"
              />
            )}
            {phase.kind === 'ready' && phase.error && (
              <Alert color="red" p="xs">
                {phase.error}
              </Alert>
            )}
            {!done && (
              <Button
                fullWidth
                size="md"
                leftSection={<IconDice5 size={18} />}
                loading={rolling}
                onClick={() =>
                  roll(choice === 'rules' ? null : (choice as RollMode))
                }
                data-autofocus
              >
                Бросить кубик
              </Button>
            )}
          </>
        )}
        {(done || start.kind === 'damage') && (
          <Text
            fw={800}
            size="lg"
            ta="center"
            className={classes.outcome}
            data-outcome={done?.outcome ?? (hit?.critical ? 'critical' : 'hit')}
            role="status"
          >
            {done
              ? outcomeText(done.outcome, done.armorClass)
              : outcomeText(hit?.critical ? 'critical' : 'hit', null)}
          </Text>
        )}
        {hit && (
          <DamageStep
            critical={hit.critical}
            pending={hit.damage}
            onDamage={onDamage}
            onDone={onClose}
          />
        )}
        {done && !hit && (
          <Button fullWidth onClick={onClose} data-autofocus>
            Готово
          </Button>
        )}
      </div>
    </Modal>
  );
}

export default AttackWindow;
