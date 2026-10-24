import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import {
  applyOps,
  createPalette,
  emptyRefsView,
  encodeChunk,
  MemoryChunkStore,
  parseChunkKey,
  type MapChunksResponse,
  type MapState,
} from 'shared';
import { describe, expect, it, vi } from 'vitest';
import type { SceneEditor } from '../../features/maps/editor';
import { renderWithProviders } from '../../test/render';
import MapViewPage from './MapViewPage';

// В jsdom нет WebGL — вместо настоящей сцены заглушка, показывающая, что ей передали.
vi.mock('../../features/maps/MapScene', async () => {
  const { useEffect } = await import('react');
  return {
    default: function MapSceneStub({
      cutY,
      editor,
      onReady,
    }: {
      cutY: number;
      editor: SceneEditor | null;
      onReady: () => void;
    }) {
      useEffect(onReady, [onReady]);
      return (
        <>
          <p>Сцена, срез {String(cutY)}</p>
          {/* Клик по земле в клетке (1, 0, 1) — вместо луча по настоящей сцене. */}
          {editor && (
            <button
              onClick={() =>
                editor.onPick({
                  hit: null,
                  place: [1, 0, 1],
                  point: [1.5, 0, 1.5],
                  normal: [0, 1, 0],
                })
              }
            >
              Клик по земле
            </button>
          )}
        </>
      );
    },
  };
});

const MAP_ID = '11111111-1111-4111-8111-111111111111';
const info = {
  id: MAP_ID,
  name: 'Подземелье',
  seq: 1,
  width: 32,
  depth: 32,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

function chunksOf(map: MapState, seq = 1): MapChunksResponse {
  return {
    seq,
    size: { width: 32, depth: 32 },
    palette: map.palette,
    blocks: [],
    chunks: [...map.store.keys()].map((key) => {
      const [cx, cy, cz] = parseChunkKey(key);
      const bytes = encodeChunk(map.store.get(key)!);
      return { cx, cy, cz, data: btoa(String.fromCharCode(...bytes)) };
    }),
    objects: [],
    nextObjectId: 1,
    refs: emptyRefsView(),
  };
}

const emptyChunks: MapChunksResponse = {
  seq: 0,
  size: { width: 32, depth: 32 },
  palette: createPalette(),
  blocks: [],
  chunks: [],
  objects: [],
  nextObjectId: 1,
  refs: emptyRefsView(),
};

function towerChunks() {
  const map: MapState = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
  };
  applyOps(map, [
    { op: 'fillBox', from: [0, 0, 0], to: [0, 4, 0], block: 'stone' },
  ]);
  return chunksOf(map);
}

function stubFetch(responses: { status: number; body?: unknown }[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const { status, body } of responses) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(body ?? {}), { status }),
    );
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage(id = MAP_ID) {
  return renderWithProviders(
    <Routes>
      <Route path="/maps/:id" element={<MapViewPage />} />
    </Routes>,
    { route: `/maps/${id}` },
  );
}

describe('MapViewPage', () => {
  it('без среза в адресе показывает всю карту', async () => {
    stubFetch([
      { status: 200, body: info },
      { status: 200, body: towerChunks() },
    ]);
    renderPage();

    expect(await screen.findByText('Сцена, срез Infinity')).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: 'Срез по высоте' }),
    ).toHaveAttribute('aria-valuenow', '4');
    expect(screen.getByText('Подземелье')).toBeInTheDocument();
    // Готовность — невидимый статус для агента в браузере, не текст на панели.
    expect(await screen.findByText('Сцена готова')).toBeInTheDocument();
  });

  it('название и размер карты — только в «Просмотре»', async () => {
    stubFetch([
      { status: 200, body: info },
      { status: 200, body: towerChunks() },
    ]);
    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByText('Подземелье')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Поставить' }));
    expect(screen.queryByText('Подземелье')).toBeNull();
    expect(screen.queryByText('32 × 32 клеток (160 × 160 фт)')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Просмотр' }));
    expect(
      screen.getByText('32 × 32 клеток (160 × 160 фт)'),
    ).toBeInTheDocument();
  });

  it('берёт срез из адреса страницы и прижимает его к границам', async () => {
    stubFetch([
      { status: 200, body: info },
      { status: 200, body: towerChunks() },
    ]);
    renderWithProviders(
      <Routes>
        <Route path="/maps/:id" element={<MapViewPage />} />
      </Routes>,
      { route: `/maps/${MAP_ID}?y=2` },
    );

    expect(await screen.findByText('Сцена, срез 2')).toBeInTheDocument();
  });

  it('шкала среза: ▼ и [ опускают срез, «Всё» снимает его', async () => {
    stubFetch([
      { status: 200, body: info },
      { status: 200, body: towerChunks() },
    ]);
    renderPage();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'Опустить срез' }),
    );
    expect(await screen.findByText('Сцена, срез 3')).toBeInTheDocument();
    await user.keyboard('[BracketLeft]');
    expect(await screen.findByText('Сцена, срез 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Всё' }));
    expect(await screen.findByText('Сцена, срез Infinity')).toBeInTheDocument();
  });

  it('блок ставится кликом по земле, изменения применяются без перечитывания', async () => {
    const fetchMock = stubFetch([
      { status: 200, body: info },
      { status: 200, body: emptyChunks },
      {
        status: 200,
        body: {
          seq: 1,
          changedCells: 1,
          createdObjectIds: [],
          refs: emptyRefsView(),
          conflicts: 0,
          paletteAdded: ['stone'],
          // Клетка (1, 0, 1): воздух → stone (id 1, поворот 0 → значение 4).
          changes: {
            cells: [1, 0, 1, 0, 4],
            paletteAdded: [{ id: 1, name: 'stone' }],
          },
        },
      },
    ]);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Поставить' }));
    await user.click(screen.getByRole('button', { name: 'Клик по земле' }));

    await waitFor(() =>
      expect(screen.queryByText(/Карта пустая/)).not.toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [url, init] = fetchMock.mock.calls[2];
    expect(url).toMatch(new RegExp(`/maps/${MAP_ID}/ops$`));
    expect(JSON.parse(init?.body as string)).toEqual({
      ops: [{ op: 'setBlock', at: [1, 0, 1], block: 'stone', rotation: 0 }],
    });
    // Сцена не перемонтировалась — «Сцена готова» остаётся.
    expect(screen.getByText('Сцена готова')).toBeInTheDocument();
  });

  it('перечитывает карту, если между правками были чужие', async () => {
    const fetchMock = stubFetch([
      { status: 200, body: info },
      { status: 200, body: emptyChunks },
      {
        status: 200,
        body: {
          seq: 5,
          changedCells: 1,
          createdObjectIds: [],
          refs: emptyRefsView(),
          conflicts: 0,
          paletteAdded: [],
          changes: { cells: [1, 0, 1, 0, 4], paletteAdded: [] },
        },
      },
      { status: 200, body: towerChunks() },
    ]);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Поставить' }));
    await user.click(screen.getByRole('button', { name: 'Клик по земле' }));

    expect(
      await screen.findByRole('slider', { name: 'Срез по высоте' }),
    ).toHaveAttribute('aria-valuenow', '4');
    expect(fetchMock.mock.calls[3][0]).toMatch(/\/chunks$/);
  });

  it('показывает ошибку отмены, не пряча сцену', async () => {
    stubFetch([
      { status: 200, body: info },
      { status: 200, body: towerChunks() },
      { status: 400, body: { message: 'Нечего отменять' } },
    ]);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Отменить' }));

    expect(await screen.findByText('Нечего отменять')).toBeInTheDocument();
    expect(screen.getByText('Сцена, срез Infinity')).toBeInTheDocument();
  });

  it('меняет размер карты из панели и показывает новый', async () => {
    const fetchMock = stubFetch([
      { status: 200, body: info },
      { status: 200, body: towerChunks() },
      {
        status: 200,
        body: {
          seq: 2,
          changedCells: 0,
          createdObjectIds: [],
          refs: emptyRefsView(),
          conflicts: 0,
          paletteAdded: [],
          changes: {
            cells: [],
            paletteAdded: [],
            size: {
              before: { width: 32, depth: 32 },
              after: { width: 34, depth: 32 },
            },
          },
        },
      },
    ]);
    renderPage();
    const user = userEvent.setup();

    expect(
      await screen.findByText('32 × 32 клеток (160 × 160 фт)'),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Изменить размер карты' }),
    );
    const apply = screen.getByRole('button', { name: 'Применить' });
    expect(apply).toBeDisabled();
    // Пока панель открыта, инструменты спрятаны и сцена ничего не правит.
    expect(
      screen.queryByRole('button', { name: 'Поставить' }),
    ).not.toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Восток' }));
    await user.type(screen.getByRole('textbox', { name: 'Восток' }), '2');
    expect(
      screen.getByText('Станет 34 × 32 клеток (170 × 160 фт)'),
    ).toBeInTheDocument();
    await user.click(apply);

    expect(
      await screen.findByText('34 × 32 клеток (170 × 160 фт)'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Применить' })).toBeNull();
    const [url, init] = fetchMock.mock.calls[2];
    expect(url).toMatch(new RegExp(`/maps/${MAP_ID}/ops$`));
    expect(JSON.parse(init?.body as string)).toEqual({
      ops: [{ op: 'resize', grow: { east: 2 } }],
    });
    // Размер применился к копии карты, без перечитывания.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('предупреждает об удалении срезанных блоков', async () => {
    stubFetch([
      { status: 200, body: info },
      { status: 200, body: towerChunks() },
    ]);
    renderPage();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'Изменить размер карты' }),
    );
    await user.clear(screen.getByRole('textbox', { name: 'Запад' }));
    await user.type(screen.getByRole('textbox', { name: 'Запад' }), '-1');

    expect(screen.getByText(/Удалится блоков: 5/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(
      screen.getByRole('button', { name: 'Поставить' }),
    ).toBeInTheDocument();
  });

  it('клавиши 1–7 выбирают инструмент, пока не открыта панель размера', async () => {
    stubFetch([
      { status: 200, body: info },
      { status: 200, body: towerChunks() },
    ]);
    renderPage();
    const user = userEvent.setup();
    const pressed = (name: string) =>
      screen.getByRole('button', { name }).getAttribute('aria-pressed');

    await screen.findByRole('button', { name: 'Ластик' });
    // Название инструмента — в шапке его свойств (docs/plan/done/scene-page.md, этап 3).
    expect(screen.getByText('Просмотр', { selector: 'p' })).toBeInTheDocument();
    // По месту клавиши: цифры на основном ряду и на цифровом блоке.
    await user.keyboard('[Digit3]');
    expect(pressed('Ластик')).toBe('true');
    expect(screen.getByText('Ластик', { selector: 'p' })).toBeInTheDocument();
    await user.keyboard('[Numpad2]');
    expect(pressed('Поставить')).toBe('true');
    // Размер карты меняется из «Просмотра»: только там видна ⚙.
    await user.keyboard('[Digit1]');

    await user.click(
      screen.getByRole('button', { name: 'Изменить размер карты' }),
    );
    expect(screen.queryByRole('button', { name: 'Ластик' })).toBeNull();
    await user.keyboard('[Digit3]');
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(pressed('Просмотр')).toBe('true');
  });

  it('показывает «Карта не найдена» на 404', async () => {
    stubFetch([
      { status: 404, body: { message: 'Карта не найдена' } },
      { status: 404, body: { message: 'Карта не найдена' } },
    ]);
    renderPage();

    expect(await screen.findByText('Карта не найдена')).toBeInTheDocument();
  });
});
