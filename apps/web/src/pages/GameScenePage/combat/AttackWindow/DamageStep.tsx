import { Alert, Button, Text } from '@mantine/core';
import { IconDroplet } from '@tabler/icons-react';
import { useState } from 'react';
import type { DamageTermInput, GameCombatDamage } from 'shared';
import { errorMessage } from '../../../../lib/apiRequest';
import { termAmount } from '../RollWindow';
import rollClasses from '../RollWindow/RollWindow.module.css';
import { byTypeText, damageTypeText, hitPointsText } from './attackWindowText';
import classes from './AttackWindow.module.css';

interface DamageStepProps {
  critical: boolean;
  // Что будет брошено, ещё без крита.
  pending: readonly DamageTermInput[];
  onDamage: () => Promise<GameCombatDamage>;
  onDone: () => void;
}

type Phase =
  | { kind: 'ready'; error: string | null }
  | { kind: 'rolling' }
  | { kind: 'done'; result: GameCombatDamage };

// Второе нажатие (docs/plan/combat.md, «Бросок в два нажатия»): «Бросить урон» — кости и
// слагаемые, итог по типам с защитами цели; хиты до и после — мастеру и по своим.
function DamageStep({ critical, pending, onDamage, onDone }: DamageStepProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'ready', error: null });
  const done = phase.kind === 'done' ? phase.result : null;
  const terms = done?.damage.terms ?? pending;

  const roll = () => {
    setPhase({ kind: 'rolling' });
    onDamage()
      .then((result) => setPhase({ kind: 'done', result }))
      .catch((err: unknown) => {
        console.error('Failed to roll damage', err);
        setPhase({
          kind: 'ready',
          error: errorMessage(err, 'Не удалось бросить урон'),
        });
      });
  };

  const byType = done?.damage.byType ?? [];
  const typed = byType.length > 1 || byType.some((p) => p.defenses.length);
  return (
    <div className={classes.damage}>
      <Text size="sm" fw={700}>
        Урон
        {critical && <span className={classes.crit}> · крит: кости вдвое</span>}
      </Text>
      <dl className={rollClasses.terms}>
        {terms.map((term, i) => (
          <div key={i} className={rollClasses.term}>
            <dt>
              {term.label} · {damageTypeText(term.type)}
            </dt>
            <dd>{termAmount(term)}</dd>
          </div>
        ))}
        {done && (
          <div className={rollClasses.total}>
            <dt>Урон</dt>
            <dd>{done.damage.total}</dd>
          </div>
        )}
      </dl>
      {typed && (
        <ul className={classes.byType}>
          {byType.map((part) => (
            <li key={part.type}>{byTypeText(part)}</li>
          ))}
        </ul>
      )}
      {done?.hitPoints && (
        <Text size="sm" ta="center">
          {hitPointsText(done.hitPoints)}
        </Text>
      )}
      {phase.kind === 'ready' && phase.error && (
        <Alert color="red" p="xs">
          {phase.error}
        </Alert>
      )}
      {done ? (
        <Button key="done" fullWidth onClick={onDone} data-autofocus>
          Готово
        </Button>
      ) : (
        <Button
          key="roll"
          fullWidth
          size="md"
          color="red"
          leftSection={<IconDroplet size={18} />}
          loading={phase.kind === 'rolling'}
          onClick={roll}
          data-autofocus
        >
          Бросить урон
        </Button>
      )}
    </div>
  );
}

export default DamageStep;
