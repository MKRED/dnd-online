import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Character, GameCreatures } from 'shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleCharacter } from '../../../test/characterFixture';
import { renderWithProviders } from '../../../test/render';
import CharacterStateCard from './CharacterStateCard';
import CreatureStateCard from './CreatureStateCard';
import CreaturesPanel from './CreaturesPanel';

const GAME = '22222222-2222-4222-8222-222222222222';
const hero: Character = {
  ...sampleCharacter,
  spellSlots: { 1: { total: 2, expended: 0 } },
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
};

// Ответы по адресу и методу; тело запроса сохраняется для проверки.
function routeFetch(routes: Record<string, (body: unknown) => unknown>) {
  const fetchMock = vi.fn<typeof fetch>((input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const key = `${init?.method ?? 'GET'} ${url.replace(/^.*\/api/, '')}`;
    const route = routes[key];
    if (!route) return Promise.reject(new Error(`Нет ответа для ${key}`));
    const body: unknown = init?.body ? JSON.parse(init.body as string) : null;
    return Promise.resolve(
      new Response(JSON.stringify(route(body)), { status: 200 }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('карточка персонажа в игре', () => {
  const base = `/games/${GAME}/characters/${hero.id}`;

  it('урон уходит правкой на сервер, карточка показывает ответ', async () => {
    const sent: unknown[] = [];
    routeFetch({
      [`GET ${base}`]: () => hero,
      [`POST ${base}/changes`]: (body) => {
        sent.push(body);
        return { ...hero, hitPointsCurrent: 13, hitPointsTemp: 0 };
      },
    });
    renderWithProviders(
      <CharacterStateCard
        gameId={GAME}
        characterId={hero.id}
        version={0}
        onOpenSheet={() => {}}
      />,
    );
    expect(await screen.findByText('ХП 20 / 28')).toBeInTheDocument();
    expect(screen.getByText('+5 временных')).toBeInTheDocument();
    const damage = screen.getByRole('button', { name: 'Урон' });
    expect(damage).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Сколько хитов'), '12');
    await userEvent.click(damage);
    expect(await screen.findByText('ХП 13 / 28')).toBeInTheDocument();
    expect(sent).toEqual([{ kind: 'damage', amount: 12 }]);
    // Спасброски — только на нуле; ячейки тратятся кружком.
    expect(screen.queryByText('Спасброски от смерти')).toBeNull();
    expect(
      screen.getByRole('group', { name: 'Ячейки 1 круга: осталось 2 из 2' }),
    ).toBeInTheDocument();
  });

  it('на нуле — спасброски от смерти; щелчок по кружку ставит счёт', async () => {
    const sent: unknown[] = [];
    const down = { ...hero, hitPointsCurrent: 0, hitPointsTemp: 0 };
    routeFetch({
      [`GET ${base}`]: () => down,
      [`POST ${base}/changes`]: (body) => {
        sent.push(body);
        return { ...down, deathSaveFailures: 2 };
      },
    });
    renderWithProviders(
      <CharacterStateCard
        gameId={GAME}
        characterId={hero.id}
        version={0}
        onOpenSheet={() => {}}
      />,
    );
    const failures = await screen.findByRole('group', {
      name: 'Провалы: 0 из 3',
    });
    await userEvent.click(
      within(failures).getByRole('button', {
        name: 'Провалы: 2',
        pressed: false,
      }),
    );
    await screen.findByRole('group', { name: 'Провалы: 2 из 3' });
    expect(sent).toEqual([{ kind: 'death_saves', successes: 0, failures: 2 }]);
  });
});

describe('существа у мастера', () => {
  const creatures: GameCreatures = {
    sceneId: 's1',
    eventSeq: 4,
    creatures: [
      {
        objectId: 2,
        health: 'bloodied',
        state: {
          name: 'Гоблин',
          hitPoints: { current: 2, max: 7, temp: 0 },
          effects: [],
          movement: { speed: 30, climb: null, moved: 10, dashes: 1 },
        },
      },
      {
        objectId: 3,
        health: 'down',
        state: {
          name: 'Орк',
          hitPoints: { current: 0, max: 15, temp: 0 },
          effects: [],
          movement: { speed: 30, climb: null, moved: 0, dashes: 0 },
        },
      },
    ],
  };

  const panel = (selectedId: number | null, moving = false) => {
    const onSelect = vi.fn();
    const onAllowance = vi.fn();
    renderWithProviders(
      <CreaturesPanel
        creatures={creatures.creatures}
        selectedId={selectedId}
        onSelect={onSelect}
        onAllowance={onAllowance}
        busy={false}
        moving={moving}
        error={null}
      />,
    );
    return { onSelect, onAllowance };
  };

  it('список — с хитами, меткой и запасом движения; щелчок выбирает', async () => {
    const { onSelect } = panel(null);
    // Запас с «Рывком» — две Скорости; у поверженного запаса нет.
    expect(
      screen.getByText('ХП 2 / 7 · Ранен · Осталось 50 из 60 фт'),
    ).toBeInTheDocument();
    expect(screen.getByText('ХП 0 / 15 · Повержен')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Гоблин/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('запас у существа: «Обновить» и «Рывок»; подсказка про ход', async () => {
    const { onAllowance } = panel(2, true);
    expect(
      screen.getByText(/Щёлкните подсвеченную клетку — существо пойдёт туда/),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Рывок: Гоблин' }),
    );
    expect(onAllowance).toHaveBeenCalledWith(2, 'dash');
    await userEvent.click(
      screen.getByRole('button', { name: 'Обновить запас: Гоблин' }),
    );
    expect(onAllowance).toHaveBeenCalledWith(2, 'refresh');
  });

  it('поверженный не ходит — так и сказано', () => {
    panel(3);
    expect(
      screen.getByText(/Поверженное существо не ходит/),
    ).toBeInTheDocument();
  });

  it('лечение монстра — правка экземпляра, ответ уходит странице', async () => {
    const sent: unknown[] = [];
    const healed = { ...creatures, eventSeq: 5 };
    routeFetch({
      [`POST /games/${GAME}/scene/creatures/2/changes`]: (body) => {
        sent.push(body);
        return healed;
      },
    });
    const onChanged = vi.fn();
    renderWithProviders(
      <CreatureStateCard
        gameId={GAME}
        objectId={2}
        state={creatures.creatures[0].state!}
        onChanged={onChanged}
        onEffects={() => {}}
        onOpenSheet={() => {}}
      />,
    );
    await userEvent.type(screen.getByLabelText('Сколько хитов'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Лечение' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(healed));
    expect(sent).toEqual([{ kind: 'heal', amount: 3 }]);
  });
});
