import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NO_ABILITY_COSTS, type Character, type GameCombatant } from 'shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleCharacter } from '../../../../test/characterFixture';
import { renderWithProviders } from '../../../../test/render';
import type { SceneCombat } from '../useSceneCombat';
import TurnPanel from './TurnPanel';

const json = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

const character: Character = {
  ...sampleCharacter,
  spellSlots: { 1: { total: 2, expended: 1 }, 2: { total: 1, expended: 0 } },
  abilities: [
    {
      id: 'link-1',
      prepared: true,
      missing: null,
      inactive: false,
      ability: {
        id: 'cat-1',
        name: 'Щит веры',
        isPublic: true,
        image: null,
        category: 'spell',
        level: 1,
        activation: { kind: 'bonus_action' },
        costs: { ...NO_ABILITY_COSTS, spellSlot: { minLevel: 1 } },
        recharge: null,
        passive: [],
      },
    },
  ],
};

const combatant: GameCombatant & {
  resources: NonNullable<GameCombatant['resources']>;
} = {
  id: 'c1',
  ref: { kind: 'figure', characterId: character.id },
  name: character.name,
  initiative: 15,
  surprised: false,
  canRoll: true,
  roll: null,
  pending: null,
  resources: {
    actions: { max: 1, used: 0 },
    bonusActions: { max: 1, used: 0 },
    reactions: { max: 1, used: 0 },
  },
  dodging: false,
  disengaged: false,
};

function renderPanel(ownTurn = true, master = false) {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(() => json(character)),
  );
  const combat = {
    busy: false,
    error: null,
    takeAction: vi.fn(() => Promise.resolve(true)),
    applyAbility: vi.fn(() => Promise.resolve(true)),
    setResources: vi.fn(() => Promise.resolve(true)),
    endTurn: vi.fn(() => Promise.resolve(true)),
  };
  renderWithProviders(
    <TurnPanel
      gameId="g1"
      combatant={combatant}
      ownTurn={ownTurn}
      waiting={ownTurn ? null : 'Ходит Гоблин'}
      source={{ kind: 'figure', characterId: character.id }}
      version={0}
      movement="30 из 30 фт"
      master={master}
      combat={combat as unknown as SceneCombat}
    />,
  );
  return combat;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TurnPanel', () => {
  it('«Рывок»: нажать значок, потом кнопку под сеткой', async () => {
    const combat = renderPanel();
    expect(screen.getByText('Ваш ход')).toBeInTheDocument();
    // Ячейки 1 круга — у подзаголовка его заклинаний, сверху — 2 круга без своих заклинаний.
    expect(await screen.findByText('ячейки 2 ●')).toBeInTheDocument();
    expect(screen.getByText('1 круг')).toBeInTheDocument();
    expect(screen.getByLabelText('ячейки: свободно 1 из 2')).toHaveTextContent(
      '●○',
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Рывок' }));
    expect(combat.takeAction).not.toHaveBeenCalled();
    // Под сеткой — кнопка с тем же именем: она и тратит действие.
    const [tile, confirm] = screen.getAllByRole('button', { name: 'Рывок' });
    expect(tile).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(confirm);
    expect(combat.takeAction).toHaveBeenCalledWith('c1', 'dash');
  });

  it('заклинание: выбор круга и «Применить» с ячейкой', async () => {
    const combat = renderPanel();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Щит веры' }),
    );
    await userEvent.click(screen.getByText('2 круг'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Применить, ячейка 2 круга' }),
    );
    expect(combat.applyAbility).toHaveBeenCalledWith('c1', {
      abilityId: 'link-1',
      slotLevel: 2,
    });
  });

  it('не свой ход: кто ходит, значки с причиной, без «Закончить ход»', async () => {
    renderPanel(false);
    expect(screen.getByText('Ходит Гоблин')).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', { name: /^Уклонение — / }),
    );
    expect(screen.getByText('Сейчас не ваш ход')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Закончить ход' })).toBeNull();
  });

  it('мастер правит потраченное меню у метки', async () => {
    const combat = renderPanel(true, true);
    await userEvent.click(
      screen.getByRole('button', { name: /^Действия: осталось 1 из 1/ }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: '0 из 1' }));
    expect(combat.setResources).toHaveBeenCalledWith('c1', { actionsUsed: 1 });
  });
});
