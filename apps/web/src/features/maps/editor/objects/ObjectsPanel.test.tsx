import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMapObjects,
  createPalette,
  emptyRefsView,
  MemoryChunkStore,
  type MapObject,
  type MapObjectRefsView,
  type MapOp,
} from 'shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import type { MapViewState } from '../../mapStateFromChunks';
import ObjectsPanel from './ObjectsPanel';
import { useObjectTool } from './useObjectTool';

const CUP = '00000000-0000-4000-8000-000000000003';
const OGRE = '00000000-0000-4000-8000-000000000001';
const DOOR = '00000000-0000-4000-8000-000000000004';
const doorModel = {
  id: 'door-model',
  size: [1, 2, 1] as const,
  palette: [],
  voxels: '',
  cells: {},
};

const objects: MapObject[] = [
  { id: 2, at: [1, 1, 1], hidden: false, kind: 'start', facing: 0 },
  {
    id: 5,
    at: [3, 1, 3],
    hidden: false,
    kind: 'container',
    name: 'Сундук',
    look: 'chest',
    items: [{ itemId: CUP, quantity: 2 }],
  },
  {
    id: 6,
    at: [4, 1, 0],
    hidden: true,
    kind: 'item',
    itemId: CUP,
    quantity: 1,
  },
  {
    id: 7,
    at: [6, 1, 6],
    hidden: false,
    kind: 'furniture',
    furnitureId: DOOR,
    facing: 0,
  },
];

const refs: MapObjectRefsView = {
  ...emptyRefsView(),
  items: { [CUP]: { missing: null, name: 'Кубок', image: null, weight: 1 } },
  furniture: {
    [DOOR]: {
      missing: null,
      name: 'Дверь',
      mount: 'doorway',
      model: { ...doorModel, size: [1, 2, 1] },
      positions: [
        { name: 'Закрыта', model: { ...doorModel, size: [1, 2, 1] } },
        { name: 'Открыта', model: { ...doorModel, size: [1, 2, 1] } },
      ],
    },
  },
};

const state: MapViewState = {
  store: new MemoryChunkStore(),
  palette: createPalette(),
  size: { width: 8, depth: 8 },
  objects: createMapObjects(objects, 8),
};

// Панель с настоящим инструментом; «клик по клетке» — кнопка вместо луча по сцене.
function Harness({
  applyOps,
  onFocus,
}: {
  applyOps: (ops: MapOp[]) => void;
  onFocus: (point: readonly number[]) => void;
}) {
  const tool = useObjectTool({ state, refs, applyOps });
  return (
    <>
      <ObjectsPanel
        tool={tool}
        state={state}
        refs={refs}
        busy={false}
        onFocus={onFocus}
      />
      <button
        onClick={() =>
          tool.pick({
            hit: [5, 0, 5],
            place: [5, 1, 5],
            point: [5.5, 1, 5.5],
            normal: [0, 1, 0],
          })
        }
      >
        Клик по клетке
      </button>
    </>
  );
}

function setup() {
  const applyOps = vi.fn<(ops: MapOp[]) => void>();
  const onFocus = vi.fn();
  renderWithProviders(<Harness applyOps={applyOps} onFocus={onFocus} />);
  return { applyOps, onFocus };
}

const sent = (applyOps: ReturnType<typeof setup>['applyOps']) =>
  applyOps.mock.calls.map(([ops]) => ops[0]);

afterEach(() => vi.unstubAllGlobals());

describe('ObjectsPanel', () => {
  it('ставит старт со взглядом; существо без выбора — подсказка, без правки', async () => {
    const { applyOps } = setup();
    await userEvent.click(
      screen.getByRole('button', { name: 'Взгляд: восток' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Клик по клетке' }),
    );
    expect(sent(applyOps)).toEqual([
      {
        op: 'placeObject',
        at: [5, 1, 5],
        object: { kind: 'start', facing: 90 },
      },
    ]);

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('[]', { status: 200 }))),
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Существо' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Клик по клетке' }),
    );
    expect(applyOps).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Выберите, что ставить')).toBeInTheDocument();
  });

  it('список выделяет объект и ведёт к нему камеру; клик мимо снимает выделение', async () => {
    const { applyOps, onFocus } = setup();
    expect(screen.getByText('На карте: 4')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /№2/ }));
    expect(onFocus).toHaveBeenCalledWith([1.5, 1, 1.5]);

    await userEvent.click(screen.getByRole('button', { name: 'Взгляд: юг' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Удалить (Del)' }),
    );
    expect(sent(applyOps)).toEqual([
      { op: 'turnObject', id: 2, facing: 180 },
      { op: 'removeObject', id: 2 },
    ]);
    // После удаления панель снова предлагает, что ставить.
    expect(screen.getByRole('radio', { name: 'Старт' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /№6/ }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Клик по клетке' }),
    );
    expect(applyOps).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('radio', { name: 'Старт' })).toBeInTheDocument();
  });

  it('«скрыт от игроков»: ставит скрытым, помечает в списке, снимается в свойствах', async () => {
    const { applyOps } = setup();
    await userEvent.click(
      screen.getByRole('checkbox', { name: /Ставить скрытым от игроков/ }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Клик по клетке' }),
    );
    expect(sent(applyOps)).toEqual([
      {
        op: 'placeObject',
        at: [5, 1, 5],
        object: { kind: 'start', facing: 0, hidden: true },
      },
    ]);

    // В списке скрыт только предмет №6.
    expect(
      screen.getAllByRole('img', { name: 'скрыт от игроков' }),
    ).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: /№6/ }));
    const toggle = screen.getByRole('switch', { name: 'Скрыт от игроков' });
    expect(toggle).toBeChecked();
    expect(screen.getByText(/Снимите — игроки увидят его сразу/)).toBeVisible();
    await userEvent.click(toggle);
    expect(sent(applyOps)[1]).toEqual({
      op: 'updateObject',
      id: 6,
      object: { hidden: false },
    });
  });

  it('«Перенести»: следующий клик по клетке переносит объект', async () => {
    const { applyOps } = setup();
    await userEvent.click(screen.getByRole('button', { name: /№6/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Перенести' }));
    expect(
      screen.getByText('Кликните клетку, куда перенести.'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Клик по клетке' }),
    );
    expect(sent(applyOps)).toEqual([
      { op: 'moveObject', id: 6, at: [5, 1, 5] },
    ]);
  });

  it('контейнер: груз против вместимости вида и поворот', async () => {
    const { applyOps } = setup();
    await userEvent.click(screen.getByRole('button', { name: /№5/ }));
    // Два кубка по 1 фнт. в сундуке на 360.
    expect(screen.getByText('Груз: 2 из 360 фнт.')).toBeInTheDocument();
    // Поставлен без взгляда — смотрит на север, поворачивается как существо.
    await userEvent.click(
      screen.getByRole('button', { name: 'Взгляд: запад' }),
    );
    expect(sent(applyOps)).toEqual([{ op: 'turnObject', id: 5, facing: 270 }]);
  });

  it('дверь: положение — операция setPosition, «Заперта» — правка объекта', async () => {
    const { applyOps } = setup();
    await userEvent.click(screen.getByRole('button', { name: /№7/ }));
    expect(screen.getByRole('radio', { name: 'Закрыта' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Открыта' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Заперта' }));
    expect(sent(applyOps)).toEqual([
      { op: 'setPosition', id: 7, position: 1 },
      { op: 'updateObject', id: 7, object: { locked: true } },
    ]);
  });

  it('количество пишется одной правкой по уходу из поля', async () => {
    const { applyOps } = setup();
    await userEvent.click(screen.getByRole('button', { name: /№6/ }));
    const input = screen.getByRole('textbox', { name: 'Количество' });
    await userEvent.clear(input);
    await userEvent.type(input, '12');
    expect(applyOps).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(sent(applyOps)).toEqual([
      { op: 'updateObject', id: 6, object: { quantity: 12 } },
    ]);
  });

  it('содержимое контейнера: добавить из поиска, убрать — весь список целиком', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            { id: OGRE, name: 'Верёвка', category: 'basic' },
            { id: CUP, name: 'Кубок', category: 'basic' },
          ]),
          { status: 200 },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { applyOps } = setup();
    await userEvent.click(screen.getByRole('button', { name: /№5/ }));
    expect(
      screen.getByRole('button', { name: 'Убрать: Кубок' }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('combobox', { name: 'Добавить предмет' }),
    );
    await userEvent.click(
      await screen.findByRole('option', { name: 'Верёвка' }),
    );
    await waitFor(() => expect(applyOps).toHaveBeenCalledTimes(1));
    expect(String(fetchMock.mock.calls[0])).toMatch(/map-catalog\?kind=item/);

    await userEvent.click(
      screen.getByRole('button', { name: 'Убрать: Кубок' }),
    );
    expect(sent(applyOps)).toEqual([
      {
        op: 'updateObject',
        id: 5,
        object: {
          items: [
            { itemId: CUP, quantity: 2 },
            { itemId: OGRE, quantity: 1 },
          ],
        },
      },
      { op: 'updateObject', id: 5, object: { items: [] } },
    ]);
  });
});
