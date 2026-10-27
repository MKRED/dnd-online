import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameCombat, GameCombatant } from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import type { CombatEntry } from './combatEntries';
import TurnButtons from './TurnButtons';
import TurnStrip from './TurnStrip';

function entry(
  id: string,
  name: string,
  initiative: number | null,
  more: Partial<GameCombatant> = {},
  kind: CombatEntry['kind'] = 'pc',
): CombatEntry {
  return {
    combatant: {
      id,
      ref: { kind: 'figure', characterId: id },
      name,
      initiative,
      surprised: false,
      canRoll: false,
      roll: null,
      pending: null,
      ...more,
    },
    id,
    name,
    kind,
    image: null,
    at: [1, 1, 1],
    health: null,
    hitPoints: null,
    hidden: false,
  };
}

const ENTRIES = [
  entry('a', 'Лира', 18, { canRoll: true }),
  entry('b', 'Гоблин', 12, {}, 'monster'),
  entry('c', 'Борн', null),
];

const COMBAT: GameCombat = {
  sceneId: 's1',
  round: 2,
  combatants: ENTRIES.map((e) => e.combatant),
  turn: 'a',
  hiddenTurn: null,
  candidates: [],
  eventSeq: 1,
};

function renderStrip(master: boolean, combat = COMBAT) {
  const actions = {
    focus: vi.fn(),
    roll: vi.fn(),
    pass: vi.fn(),
    move: vi.fn(),
    edit: vi.fn(),
  };
  const onEndTurn = vi.fn();
  renderWithProviders(
    <TurnStrip
      combat={combat}
      entries={ENTRIES}
      master={master}
      actions={actions}
      onAdd={vi.fn()}
    >
      <TurnButtons
        combat={combat}
        entries={ENTRIES}
        master={master}
        busy={false}
        error={null}
        onClearError={vi.fn()}
        onRoll={actions.roll}
        onRollCreatures={vi.fn()}
        onEndTurn={onEndTurn}
      />
    </TurnStrip>,
  );
  return { actions, onEndTurn };
}

describe('TurnStrip', () => {
  it('игрок: раунд, текущий, щелчок показывает на сцене, «Закончить ход» своему', async () => {
    const { actions, onEndTurn } = renderStrip(false);
    const strip = screen.getByRole('group', { name: 'Очерёдность хода' });
    expect(within(strip).getByText('2')).toBeInTheDocument();
    const lira = within(strip).getByRole('button', {
      name: 'Лира, инициатива 18, сейчас ходит',
    });
    const user = userEvent.setup();
    await user.click(
      within(strip).getByRole('button', { name: 'Гоблин, инициатива 12' }),
    );
    expect(actions.focus).toHaveBeenCalledWith(ENTRIES[1]);
    expect(lira).toHaveAttribute('data-current');
    await user.click(screen.getByRole('button', { name: 'Закончить ход' }));
    expect(onEndTurn).toHaveBeenCalledWith('a');
  });

  it('ход скрытого противника — безымянный «?» на его месте', () => {
    renderStrip(false, { ...COMBAT, turn: null, hiddenTurn: { after: 'a' } });
    const strip = screen.getByRole('group', { name: 'Очерёдность хода' });
    const cells = Array.from(strip.querySelectorAll('[aria-label]'));
    expect(cells.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Лира, инициатива 18',
      'Ход противника',
      'Гоблин, инициатива 12',
      'Борн, ещё не бросил инициативу',
    ]);
    expect(screen.getAllByText('Ход противника').length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('button', { name: 'Закончить ход' }),
    ).not.toBeInTheDocument();
  });

  it('чужой ход — кнопки нет', () => {
    renderStrip(false, { ...COMBAT, turn: 'b' });
    expect(
      screen.queryByRole('button', { name: 'Закончить ход' }),
    ).not.toBeInTheDocument();
  });

  it('мастер: меню портрета передаёт ход и переставляет', async () => {
    const { actions } = renderStrip(true);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Гоблин, инициатива 12' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Передать ход' }),
    );
    expect(actions.pass).toHaveBeenCalledWith('b');
    await user.click(
      screen.getByRole('button', { name: 'Гоблин, инициатива 12' }),
    );
    // Гоблин последний из бросивших: позже некуда.
    expect(
      screen.queryByRole('menuitem', { name: 'Позже в очереди' }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('menuitem', { name: 'Раньше в очереди' }),
    );
    expect(actions.move).toHaveBeenCalledWith('b', -1);
  });

  it('пока бросают инициативу — бросок своему герою и за монстров мастеру', async () => {
    const rolling: GameCombat = { ...COMBAT, turn: null };
    const mine = [
      entry('a', 'Лира', null, { canRoll: true }),
      entry('b', 'Гоблин', null, { canRoll: true }, 'monster'),
    ];
    const onRoll = vi.fn();
    renderWithProviders(
      <TurnButtons
        combat={rolling}
        entries={mine}
        master={false}
        busy={false}
        error={null}
        onClearError={vi.fn()}
        onRoll={onRoll}
        onRollCreatures={vi.fn()}
        onEndTurn={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Бросить инициативу' }),
    );
    expect(onRoll).toHaveBeenCalledWith(mine[0]);
    expect(
      screen.queryByRole('button', { name: /Бросить за монстров/ }),
    ).not.toBeInTheDocument();
  });
});
