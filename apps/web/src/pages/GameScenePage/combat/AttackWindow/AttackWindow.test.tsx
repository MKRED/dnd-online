import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  AttackTarget,
  GameCombat,
  GameCombatAttack,
  GameCombatDamage,
  PendingDamage,
} from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import AttackWindow from './AttackWindow';

const TARGET: AttackTarget = {
  ref: { kind: 'creature', objectId: 2 },
  name: 'Гоблин',
  ally: false,
  distance: 5,
  band: 'normal',
  cover: 'half',
  roll: {
    terms: [{ kind: 'number', label: 'Сила', amount: 3 }],
    reasons: { advantage: [], disadvantage: [] },
  },
  armorClass: 17,
};

const PENDING: PendingDamage = {
  attack: 'meleeMain',
  name: 'Длинный меч',
  target: { ref: TARGET.ref, name: 'Гоблин' },
  critical: true,
  damage: [
    {
      kind: 'dice',
      label: 'Длинный меч',
      count: 1,
      die: 8,
      sign: 1,
      type: 'slashing',
    },
  ],
};

// Очередь после броска: у атакующего — попадание, ждущее урона.
const combat = (pending: PendingDamage | null) =>
  ({
    combatants: [{ id: 'c1', attack: { pending } }],
  }) as unknown as GameCombat;

const attackResult = (
  outcome: GameCombatAttack['outcome'],
  natural: number,
): GameCombatAttack => ({
  roll: {
    dice: [natural],
    kept: 0,
    mode: 'normal',
    reasons: TARGET.roll.reasons,
    master: null,
    terms: TARGET.roll.terms.map((t) => ({
      ...t,
    })) as GameCombatAttack['roll']['terms'],
    total: natural + 3,
  },
  outcome,
  armorClass: 17,
  combat: combat(outcome === 'miss' ? null : PENDING),
});

const DAMAGE: GameCombatDamage = {
  damage: {
    critical: true,
    terms: [
      {
        kind: 'dice',
        label: 'Длинный меч',
        count: 2,
        die: 8,
        sign: 1,
        rolls: [8, 6],
        amount: 14,
        type: 'slashing',
      },
    ],
    byType: [
      { type: 'slashing', rolled: 14, dealt: 7, defenses: ['resistance'] },
    ],
    total: 7,
  },
  hitPoints: { before: 30, after: 23, max: 30 },
  combat: combat(null),
};

function renderWindow(
  onAttack: () => Promise<GameCombatAttack>,
  start: 'attack' | 'damage' = 'attack',
) {
  const onDamage = vi.fn(() => Promise.resolve(DAMAGE));
  const onClose = vi.fn();
  renderWithProviders(
    <AttackWindow
      combatantId="c1"
      attackerName="Лира"
      start={
        start === 'attack'
          ? {
              kind: 'attack',
              attack: 'meleeMain',
              name: 'Длинный меч',
              target: TARGET,
            }
          : { kind: 'damage', pending: PENDING }
      }
      master
      onAttack={onAttack}
      onDamage={onDamage}
      onClose={onClose}
    />,
  );
  return { onDamage, onClose, dialog: screen.getByRole('dialog') };
}

describe('AttackWindow', () => {
  it('промах: итог против КД мастеру и «Готово» без урона', async () => {
    const onAttack = vi.fn(() => Promise.resolve(attackResult('miss', 4)));
    const { dialog, onClose } = renderWindow(onAttack);
    expect(
      within(dialog).getByText('Укрытие ½: +2 к КД цели'),
    ).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(
      within(dialog).getByRole('button', { name: 'Бросить кубик' }),
    );
    expect(onAttack).toHaveBeenCalledWith(null);
    expect(
      await within(dialog).findByText(
        'Промах · против КД 17',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Бросить урон' }),
    ).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Готово' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('крит: «Бросить урон» — кости вдвое, итог по типам и хиты цели', async () => {
    const onAttack = vi.fn(() => Promise.resolve(attackResult('critical', 20)));
    const { dialog, onDamage } = renderWindow(onAttack);
    const user = userEvent.setup();
    await user.click(
      within(dialog).getByRole('button', { name: 'Бросить кубик' }),
    );
    await user.click(
      await within(dialog).findByRole(
        'button',
        { name: 'Бросить урон' },
        { timeout: 3000 },
      ),
    );
    expect(onDamage).toHaveBeenCalled();
    expect(
      await within(dialog).findByText('7 рубящий (выпало 14, сопротивление)'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Хиты цели: 30 → 23 из 30'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('+14 (2к8: 8, 6)')).toBeInTheDocument();
  });

  it('открыто с прошлого попадания — сразу шаг урона', async () => {
    const onAttack = vi.fn();
    const { dialog } = renderWindow(onAttack, 'damage');
    expect(
      within(dialog).getByText('Критическое попадание'),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Бросить кубик' }),
    ).toBeNull();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Бросить урон' }),
    );
    expect(await within(dialog).findByText('Готово')).toBeInTheDocument();
    expect(onAttack).not.toHaveBeenCalled();
  });
});
