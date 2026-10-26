import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameCreature, MapObject } from 'shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import MovementRow from '../creatures/MovementRow';
import ParticipantsTab from './ParticipantsTab';
import { creatureParticipants, heroParticipants } from './participantList';

// Вкладка «Участники» (docs/plan/done/scene-page.md, этап 2).
const goblin: GameCreature = {
  objectId: 2,
  health: 'bloodied',
  state: {
    name: 'Гоблин',
    hitPoints: { current: 2, max: 7, temp: 0 },
    effects: [],
    movement: { speed: 30, climb: null, moved: 10, dashes: 1 },
  },
};
const orc: GameCreature = {
  objectId: 3,
  health: 'down',
  state: {
    name: 'Орк',
    hitPoints: { current: 0, max: 15, temp: 0 },
    effects: [],
    movement: { speed: 30, climb: null, moved: 0, dashes: 0 },
  },
};
const objects = new Map<number, Partial<MapObject>>([
  [2, { kind: 'monster', hidden: true }],
  [3, { kind: 'npc', hidden: false }],
]);
const objectOf = (id: number) => objects.get(id) as MapObject | undefined;

describe('участники', () => {
  afterEach(() => localStorage.clear());

  it('существа: хиты, метка, запас с «Рывком», скрытые помечены; поверженный без запаса', () => {
    const [g, o] = creatureParticipants([goblin, orc], objectOf, () => null);
    expect(g).toMatchObject({
      kind: 'monster',
      hitPoints: { current: 2, max: 7 },
      feetLeft: 50,
      hidden: true,
    });
    expect(o).toMatchObject({ kind: 'npc', feetLeft: null });
  });

  it('у игрока существ нет: без состояния строки не будет', () => {
    expect(
      creatureParticipants([{ ...goblin, state: null }], objectOf, () => null),
    ).toEqual([]);
  });

  it('чужой герой — без чисел и запаса, выбрать нельзя', () => {
    const [hero] = heroParticipants(
      [
        {
          character: { id: 'c1', name: 'Лира' },
          ownerId: 'u2',
          at: [0, 1, 0],
          facing: 0,
          size: 'medium',
          image: null,
          model: null,
          speed: 30,
          climb: null,
          moved: 0,
          dashes: 0,
          canMove: false,
          health: 'bloodied',
          hitPoints: null,
        },
      ],
      'g1',
    );
    expect(hero).toMatchObject({
      hitPoints: null,
      feetLeft: null,
      selectable: false,
    });
  });

  it('строки показывают хиты и метку; щелчок выбирает; бой мастера сверху', async () => {
    const onSelectCreature = vi.fn();
    renderWithProviders(
      <ParticipantsTab
        heroes={[]}
        creatures={creatureParticipants([goblin, orc], objectOf, () => null)}
        selectedKey={null}
        onSelectHero={() => {}}
        onSelectCreature={onSelectCreature}
        combat={<span>Бой мастера</span>}
        errors={[null]}
        selected={null}
      />,
    );
    // НПС (орк) — своим разделом перед существами.
    const sections = screen
      .getAllByText(/^(НПС|Существа)$/)
      .map((el) => el.textContent);
    expect(sections).toEqual(['НПС', 'Существа']);
    // Группы по умолчанию свёрнуты: в заголовке — сколько и кто в беде.
    expect(screen.queryByText('2/7 · Ранен')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Существа\s*1 · ранено 1/ }),
    ).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(screen.getByRole('button', { name: /^НПС/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Существа/ }));
    expect(screen.getByText('2/7 · Ранен')).toBeInTheDocument();
    expect(screen.getByText('0/15 · Повержен')).toBeInTheDocument();
    expect(screen.getByText('50 фт')).toBeInTheDocument();
    expect(screen.getByLabelText('Скрыт от игроков')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Гоблин' }));
    expect(onSelectCreature).toHaveBeenCalledWith('2');
    expect(screen.getByText('Бой мастера')).toBeInTheDocument();
  });

  it('уникальные — своей группой; одинаковые — одной строкой, выбранный раскрывает её', async () => {
    const rat = (objectId: number, current: number): GameCreature => ({
      objectId,
      health: current === 0 ? 'down' : null,
      state: {
        name: 'Крыса',
        hitPoints: { current, max: 4, temp: 0 },
        effects: [],
        movement: { speed: 30, climb: null, moved: 0, dashes: 0 },
      },
    });
    const boss = {
      ...goblin,
      objectId: 9,
      state: { ...goblin.state!, name: 'Король' },
    };
    const kinds = new Map<number, Partial<MapObject>>([
      [4, { kind: 'monster', monsterId: 'rat' }],
      [5, { kind: 'monster', monsterId: 'rat' }],
      [9, { kind: 'monster', monsterId: 'king' }],
    ]);
    const creatures = creatureParticipants(
      [rat(4, 4), rat(5, 0), boss],
      (id) => kinds.get(id) as MapObject | undefined,
      () => null,
      (object) => object?.kind === 'monster' && object.monsterId === 'king',
    );
    const props = {
      heroes: [],
      creatures,
      onSelectHero: () => {},
      onSelectCreature: () => {},
      errors: [],
      selected: null,
    };
    const { rerender } = renderWithProviders(
      <ParticipantsTab {...props} selectedKey={null} />,
    );
    expect(
      screen
        .getAllByText(/^(Уникальные существа|Существа)$/)
        .map((el) => el.textContent),
    ).toEqual(['Уникальные существа', 'Существа']);
    await userEvent.click(screen.getByRole('button', { name: /^Существа/ }));
    const kin = screen.getByRole('button', {
      name: /Крыса\s*×2 · повержено 1/,
    });
    expect(kin).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('4/4')).not.toBeInTheDocument();
    // Выбор на сцене раскрывает группу и строку одинаковых.
    await userEvent.click(screen.getByRole('button', { name: /^Существа/ }));
    rerender(<ParticipantsTab {...props} selectedKey="creature:5" />);
    expect(screen.getByText('0/4 · Повержен')).toBeInTheDocument();
    expect(screen.getByText('4/4')).toBeInTheDocument();
  });

  it('выбранный — над списком', () => {
    renderWithProviders(
      <ParticipantsTab
        heroes={[]}
        creatures={creatureParticipants([goblin], objectOf, () => null)}
        selectedKey="creature:2"
        onSelectHero={() => {}}
        onSelectCreature={() => {}}
        errors={[]}
        selected={<span>Карточка гоблина</span>}
      />,
    );
    const card = screen.getByText('Карточка гоблина');
    const row = screen.getByRole('button', { name: 'Гоблин' });
    expect(
      card.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('пустая сцена — так и сказано', () => {
    renderWithProviders(
      <ParticipantsTab
        heroes={[]}
        creatures={[]}
        selectedKey={null}
        onSelectHero={() => {}}
        onSelectCreature={() => {}}
        errors={[]}
        selected={null}
      />,
    );
    expect(screen.getByText(/На сцене никого нет/)).toBeInTheDocument();
  });

  it('запас выбранного: «Обновить» и «Рывок» у мастера', async () => {
    const onAllowance = vi.fn();
    renderWithProviders(
      <MovementRow
        name="Гоблин"
        movement={goblin.state!.movement}
        onAllowance={onAllowance}
        busy={false}
      />,
    );
    expect(screen.getByText('Осталось 50 из 60 фт')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Рывок: Гоблин' }),
    );
    expect(onAllowance).toHaveBeenCalledWith('dash');
    await userEvent.click(
      screen.getByRole('button', { name: 'Обновить запас: Гоблин' }),
    );
    expect(onAllowance).toHaveBeenCalledWith('refresh');
  });
});
