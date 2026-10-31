import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameCombat, GameCombatant } from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import type { CombatEntry } from './combatEntries';
import TurnButtons from './TurnButtons';
import TurnPortrait from './TurnPortrait';
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
      resources: null,
      dodging: false,
      disengaged: false,
      attack: null,
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
        onRollHeroes={vi.fn()}
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
    expect(within(strip).getByRole('status')).toHaveTextContent('Раунд2');
    // Лира — первая в очереди: перед ней черта идущего раунда.
    expect(
      within(strip).getByRole('separator', { name: 'Раунд 2' }),
    ).toBeInTheDocument();
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
        onRollHeroes={vi.fn()}
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
    expect(
      screen.queryByRole('button', { name: /Бросить за героев/ }),
    ).not.toBeInTheDocument();
  });

  it('мастер: «Бросить за монстров» и «Бросить за героев» с числом не бросивших', async () => {
    const rolling: GameCombat = { ...COMBAT, turn: null };
    const waiting = [
      entry('a', 'Лира', null),
      entry('c', 'Борн', null),
      entry('d', 'Кайра', 15),
      entry('b', 'Гоблин', null, {}, 'monster'),
    ];
    const onRollHeroes = vi.fn();
    renderWithProviders(
      <TurnButtons
        combat={rolling}
        entries={waiting}
        master
        busy={false}
        error={null}
        onClearError={vi.fn()}
        onRoll={vi.fn()}
        onRollCreatures={vi.fn()}
        onRollHeroes={onRollHeroes}
        onEndTurn={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Бросить за монстров \(1\)/ }),
    ).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: /Бросить за героев \(2\)/ }));
    expect(onRollHeroes).toHaveBeenCalled();
  });
});

describe('TurnPortrait', () => {
  it('«Уклонение» и «Отход» — значок в углу и в подписи', () => {
    renderWithProviders(
      <>
        <TurnPortrait
          entry={entry('d', 'Гоблин', 12, { dodging: true }, 'monster')}
          current={false}
          acted={false}
        />
        <TurnPortrait
          entry={entry('e', 'Лира', 18, { disengaged: true })}
          current
          acted={false}
        />
      </>,
    );
    const goblin = screen.getByRole('button', {
      name: 'Гоблин, инициатива 12, уклоняется',
    });
    expect(goblin.querySelector('svg')).not.toBeNull();
    expect(
      screen.getByRole('button', {
        name: 'Лира, инициатива 18, отходит, сейчас ходит',
      }),
    ).toBeInTheDocument();
  });

  it('полоска хитов — только с числами: у раненого врага игрока её нет, «Ранен» в подписи', () => {
    renderWithProviders(
      <>
        <TurnPortrait
          entry={{
            ...entry('d', 'Гоблин', 12, {}, 'monster'),
            health: 'bloodied',
          }}
          current={false}
          acted={false}
        />
        <TurnPortrait
          entry={{
            ...entry('o', 'Огр', 8, {}, 'monster'),
            hitPoints: { current: 20, max: 59 },
          }}
          current={false}
          acted={false}
        />
      </>,
    );
    const goblin = screen.getByRole('button', {
      name: 'Гоблин, инициатива 12, Ранен',
    });
    const goblinBar = goblin.querySelector('[data-empty]');
    expect(goblinBar).not.toBeNull();
    expect(goblinBar?.childElementCount).toBe(0);

    const ogre = screen.getByRole('button', { name: 'Огр, инициатива 8' });
    expect(ogre.querySelector('[data-empty]')).toBeNull();
    const fill = ogre.querySelector<HTMLElement>('[data-low]');
    expect(fill?.style.width).toBe(`${(20 / 59) * 100}%`);
  });
});
